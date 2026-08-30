#!/usr/bin/env python3
"""
token-burn: Calculate token usage and costs from pi session JSONL files.

Streams through JSONL files in buffered chunks to handle large files
without loading into memory. Extracts actual token counts from message metadata
including cached tokens (cacheRead, cacheWrite).

Includes real pricing data for accurate cost estimation.
"""

import json
import sys
import os
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Dict, Iterator, Tuple, Optional, List

# ============================================================================
# MODEL PRICING (USD per 1M tokens)
# ============================================================================
# Format: { 'pattern': { input, output, cache_read, cache_write } }
# Patterns are matched in order (more specific first)
# Cache pricing is ~90% off for read, ~25% more for write

MODEL_PRICING: List[Tuple[str, Dict[str, float]]] = [
    # Anthropic Claude - specific models first
    ('claude-opus-4.5', {'input': 15, 'output': 75,  'cache_read': 1.50,  'cache_write': 18.75}),
    ('claude-opus-4',   {'input': 15, 'output': 75,  'cache_read': 1.50,  'cache_write': 18.75}),
    ('claude-opus',     {'input': 15, 'output': 75,  'cache_read': 1.50,  'cache_write': 18.75}),
    ('claude-sonnet-4', {'input': 3,  'output': 15,  'cache_read': 0.30,  'cache_write': 3.75}),
    ('claude-sonnet',   {'input': 3,  'output': 15,  'cache_read': 0.30,  'cache_write': 3.75}),
    ('claude-haiku',    {'input': 0.80,'output': 4,   'cache_read': 0.08,  'cache_write': 1.00}),
    
    # OpenAI GPT models
    ('gpt-4.5',         {'input': 75, 'output': 150, 'cache_read': 37.50, 'cache_write': 75}),
    ('gpt-4o-mini',     {'input': 0.15,'output': 0.60,'cache_read': 0.075, 'cache_write': 0.15}),
    ('gpt-4o',          {'input': 2.50,'output': 10,  'cache_read': 1.25,  'cache_write': 2.50}),
    ('gpt-4-turbo',     {'input': 10, 'output': 30,  'cache_read': 5,      'cache_write': 10}),
    ('gpt-4',           {'input': 30, 'output': 60,  'cache_read': 15,     'cache_write': 30}),
    ('gpt-3.5',         {'input': 0.50,'output': 1.50,'cache_read': 0.25,  'cache_write': 0.50}),
    ('codex',           {'input': 3,  'output': 12,  'cache_read': 1.50,   'cache_write': 3}),
    ('o3-mini',         {'input': 1.10,'output': 4.40,'cache_read': 0.55,  'cache_write': 1.10}),
    ('o1',              {'input': 15, 'output': 60,  'cache_read': 7.50,   'cache_write': 15}),
    
    # Google Gemini
    ('gemini-2.0-flash',{'input': 0.10,'output': 0.40,'cache_read': 0.025, 'cache_write': 0.10}),
    ('gemini-2',        {'input': 1.25,'output': 10,  'cache_read': 0.31,  'cache_write': 1.25}),
    ('gemini-1.5-pro',  {'input': 1.25,'output': 10,  'cache_read': 0.31,  'cache_write': 1.25}),
    ('gemini-1.5-flash',{'input': 0.075,'output': 0.30,'cache_read': 0.019,'cache_write': 0.075}),
    ('gemini',          {'input': 1.25,'output': 10,  'cache_read': 0.31,  'cache_write': 1.25}),
    
    # Kimi Moonshot
    ('kimi-k2',         {'input': 0.60,'output': 2.50,'cache_read': 0.15,  'cache_write': 0.60}),
    ('k2p5',            {'input': 0.60,'output': 2.50,'cache_read': 0.15,  'cache_write': 0.60}),
    ('kimi',            {'input': 2,  'output': 8,   'cache_read': 0.50,   'cache_write': 2}),
    
    # GLM / Z.ai
    ('glm-4',           {'input': 0.35,'output': 0.35,'cache_read': 0.09,  'cache_write': 0.35}),
    ('glm-5',           {'input': 0.50,'output': 0.50,'cache_read': 0.125, 'cache_write': 0.50}),
    ('glm',             {'input': 0.50,'output': 2,   'cache_read': 0.125, 'cache_write': 0.50}),
    
    # DeepSeek
    ('deepseek',        {'input': 0.27,'output': 1.10,'cache_read': 0.07,  'cache_write': 0.27}),
    
    # Default fallback (conservative mid-tier pricing)
    ('default',         {'input': 3,  'output': 15,  'cache_read': 0.75,   'cache_write': 3})
]


def get_pricing(model_name: str) -> Dict[str, float]:
    """Get pricing for a model by matching against known patterns."""
    name_lower = model_name.lower()
    for pattern, pricing in MODEL_PRICING:
        if pattern in name_lower:
            return pricing
    return MODEL_PRICING[-1][1]  # default


def calculate_cost(counts: dict, model_name: str) -> dict:
    """
    Calculate cost for a model's token usage.
    
    Returns dict with individual costs and total.
    """
    p = get_pricing(model_name)
    
    input_cost = (counts['input'] / 1_000_000) * p['input']
    output_cost = (counts['output'] / 1_000_000) * p['output']
    cache_read_cost = (counts['cache_read'] / 1_000_000) * p['cache_read']
    cache_write_cost = (counts.get('cache_write', 0) / 1_000_000) * p['cache_write']
    
    return {
        'input': input_cost,
        'output': output_cost,
        'cache_read': cache_read_cost,
        'cache_write': cache_write_cost,
        'total': input_cost + output_cost + cache_read_cost + cache_write_cost
    }


def format_cost(n: float) -> str:
    """Format cost with appropriate precision."""
    if n >= 1000:
        return f"${n:,.0f}"
    elif n >= 1:
        return f"${n:.2f}"
    elif n >= 0.01:
        return f"${n:.3f}"
    else:
        return f"${n:.4f}"


def stream_jsonl_lines(filepath: str, buffer_size: int = 8192) -> Iterator[str]:
    """Stream lines from a JSONL file using buffered reading."""
    with open(filepath, 'r', encoding='utf-8') as f:
        buffer = ''
        while True:
            chunk = f.read(buffer_size)
            if not chunk:
                if buffer.strip():
                    yield buffer.strip()
                break
            
            buffer += chunk
            lines = buffer.split('\n')
            buffer = lines[-1]
            
            for line in lines[:-1]:
                if line.strip():
                    yield line.strip()


def extract_model_info(data: dict) -> Tuple[Optional[str], Optional[str]]:
    """Extract model provider and ID from pi/OpenClaw session data structures."""
    msg = data.get('message', {})
    
    # In .pi format, provider and model are at the message level
    if msg:
        provider = msg.get('provider')
        model = msg.get('model')
        if provider and model:
            return provider, model
    
    # Check for model-snapshot custom events (OpenClaw format)
    if data.get('type') == 'custom' and data.get('customType') == 'model-snapshot':
        snap = data.get('data', {})
        provider = snap.get('provider')
        model = snap.get('modelId')
        if provider and model:
            return provider, f"{provider}/{model}"
    
    # OpenClaw model_change events
    if data.get('type') == 'model_change':
        provider = data.get('provider')
        model = data.get('modelId')
        if provider and model:
            return provider, f"{provider}/{model}"
    
    return None, None


def extract_token_usage(data: dict) -> Tuple[int, int, int, int, int]:
    """
    Extract token usage from message data, including cached tokens.
    
    Returns: (input_tokens, output_tokens, cache_read, cache_write, total_tokens)
    """
    msg = data.get('message', {})
    usage = msg.get('usage', {})
    
    if usage:
        inp = usage.get('input', 0) or usage.get('inputTokens', 0) or 0
        out = usage.get('output', 0) or usage.get('outputTokens', 0) or 0
        cache_read = usage.get('cacheRead', 0) or 0
        cache_write = usage.get('cacheWrite', 0) or 0
        total = usage.get('totalTokens', 0) or (inp + out + cache_read + cache_write)
        return inp, out, cache_read, cache_write, total
    
    return 0, 0, 0, 0, 0


def get_model_name(provider: Optional[str], model_id: Optional[str]) -> str:
    """Generate canonical model name."""
    if provider and model_id:
        if '/' in model_id:
            return model_id
        return f"{provider}/{model_id}"
    elif model_id:
        return model_id
    elif provider:
        return provider
    return "unknown"


def get_model_emoji(model_name: str) -> str:
    """Get an appropriate emoji for a model/provider."""
    model_lower = model_name.lower()
    
    if 'kimi' in model_lower:
        return '🌙'
    elif 'claude' in model_lower or 'anthropic' in model_lower:
        return '🧠'
    elif 'gpt' in model_lower or 'openai' in model_lower:
        return '🤖'
    elif 'gemini' in model_lower or 'google' in model_lower:
        return '💎'
    elif 'glm' in model_lower or 'zai' in model_lower:
        return '⚡'
    elif 'llama' in model_lower or 'meta' in model_lower:
        return '🦙'
    elif 'deepseek' in model_lower:
        return '🔮'
    else:
        return '🤖'


def format_tokens(n: int) -> str:
    """Format token numbers with K/M suffix for readability."""
    if n >= 1_000_000:
        return f"{n/1_000_000:.2f}M"
    elif n >= 1_000:
        return f"{n/1_000:.1f}K"
    else:
        return str(n)


def format_number(n: int) -> str:
    """Format large numbers with commas."""
    return f"{n:,}"


def print_table_header(title: str, emoji: str = "📊"):
    """Print a beautiful table header."""
    width = 70
    print()
    print(f"╔{'═' * width}╗")
    print(f"║{emoji}  {title:<{width-4}}║")
    print(f"╠{'═' * width}╣")


def print_table_row(label: str, value: str, emoji: str = "  ", indent: int = 0):
    """Print a table row with consistent formatting."""
    width = 70
    spaces = " " * indent
    print(f"║{spaces}{emoji} {label:<20} {value:>42}{spaces} ║")


def print_table_separator():
    """Print a table separator line."""
    width = 70
    print(f"╠{'═' * width}╣")


def print_table_footer():
    """Print a table footer."""
    width = 70
    print(f"╚{'═' * width}╝")


def print_model_card(model: str, counts: dict, rank: int, show_costs: bool = True):
    """Print a beautiful model usage card with costs."""
    emoji = get_model_emoji(model)
    total = counts['total']
    
    # Calculate costs
    costs = calculate_cost(counts, model)
    
    print()
    print(f"┌{'─' * 68}┐")
    print(f"│ #{rank:<2} {emoji}  {model:<55} │")
    print(f"├{'─' * 68}┤")
    
    # Input tokens
    inp_pct = (counts['input'] / total * 100) if total > 0 else 0
    inp_cost = format_cost(costs['input'])
    print(f"│  📥  Input:        {format_number(counts['input']):>15}  ({format_tokens(counts['input'])})  {inp_pct:>5.1f}%  │")
    
    # Output tokens
    out_pct = (counts['output'] / total * 100) if total > 0 else 0
    print(f"│  📤  Output:       {format_number(counts['output']):>15}  ({format_tokens(counts['output'])})  {out_pct:>5.1f}%  │")
    
    # Cache read (discounted - if any)
    if counts['cache_read'] > 0:
        cache_r_pct = (counts['cache_read'] / total * 100) if total > 0 else 0
        print(f"│  💾  Cache Read:   {format_number(counts['cache_read']):>15}  ({format_tokens(counts['cache_read'])})  {cache_r_pct:>5.1f}%  │")
    
    # Cache write (if any)
    if counts.get('cache_write', 0) > 0:
        cache_w_pct = (counts['cache_write'] / total * 100) if total > 0 else 0
        print(f"│  💿  Cache Write:  {format_number(counts['cache_write']):>15}  ({format_tokens(counts['cache_write'])})  {cache_w_pct:>5.1f}%  │")
    
    print(f"├{'─' * 68}┤")
    print(f"│  🔥  TOTAL TOKENS: {format_number(total):>15}  ({format_tokens(total)})           │")
    
    # Cost breakdown
    if show_costs:
        print(f"├{'─' * 68}┤")
        print(f"│  💰  ESTIMATED COST: {format_cost(costs['total']):>46} │")
        if costs['cache_read'] > 0.01 or costs['cache_write'] > 0.01:
            print(f"│      ├─ Input:       {format_cost(costs['input']):>43} │")
            print(f"│      ├─ Output:      {format_cost(costs['output']):>43} │")
            if costs['cache_read'] > 0.01:
                print(f"│      ├─ Cache Read:  {format_cost(costs['cache_read']):>43} │")
            if costs['cache_write'] > 0.01:
                print(f"│      └─ Cache Write: {format_cost(costs['cache_write']):>43} │")
    
    print(f"└{'─' * 68}┘")


def process_jsonl_file(filepath: str, buffer_size: int = 8192) -> Dict:
    """Process a JSONL file and calculate token usage."""
    results = {
        'file': filepath,
        'lines_processed': 0,
        'messages_processed': 0,
        'tokens_by_model': defaultdict(lambda: {'input': 0, 'output': 0, 'cache_read': 0, 'cache_write': 0, 'total': 0}),
        'errors': 0,
        'total_input': 0,
        'total_output': 0,
        'total_cache_read': 0,
        'total_cache_write': 0,
        'total_tokens': 0
    }
    
    current_model = None
    
    for line in stream_jsonl_lines(filepath, buffer_size):
        results['lines_processed'] += 1
        
        try:
            data = json.loads(line)
            msg_type = data.get('type')
            
            # Skip session metadata lines (OpenClaw session type)
            if msg_type == 'session':
                continue
            
            # Handle OpenClaw model_change events
            if msg_type == 'model_change':
                provider, model_id = extract_model_info(data)
                if model_id:
                    current_model = get_model_name(provider, model_id)
                continue
            
            # Handle OpenClaw thinking_level_change events (track but don't process tokens)
            if msg_type == 'thinking_level_change':
                # Thinking level changes don't have token usage, just metadata
                continue
            
            # Handle model-snapshot events (OpenClaw format)
            if msg_type == 'custom' and data.get('customType') == 'model-snapshot':
                provider, model_id = extract_model_info(data)
                if model_id:
                    current_model = get_model_name(provider, model_id)
            
            # Handle message events with usage data
            if msg_type == 'message':
                provider, model_id = extract_model_info(data)
                if model_id:
                    current_model = get_model_name(provider, model_id)
                
                inp, out, cache_read, cache_write, total = extract_token_usage(data)
                
                if total > 0:
                    results['messages_processed'] += 1
                    model = current_model or "unknown"
                    
                    results['tokens_by_model'][model]['input'] += inp
                    results['tokens_by_model'][model]['output'] += out
                    results['tokens_by_model'][model]['cache_read'] += cache_read
                    results['tokens_by_model'][model]['cache_write'] += cache_write
                    results['tokens_by_model'][model]['total'] += total
                    
                    results['total_input'] += inp
                    results['total_output'] += out
                    results['total_cache_read'] += cache_read
                    results['total_cache_write'] += cache_write
                    results['total_tokens'] += total
                    
        except Exception as e:
            results['errors'] += 1
            if results['errors'] <= 3:
                print(f"⚠️  Warning: Error processing line in {filepath}: {e}", file=sys.stderr)
    
    results['tokens_by_model'] = dict(results['tokens_by_model'])
    return results


def find_session_files(base_path: str) -> list:
    """Find all JSONL session files in a directory."""
    base = Path(base_path)
    files = []
    for pattern in ['**/*.jsonl', '**/*.jsonl.gz']:
        files.extend(base.glob(pattern))
    return sorted(files)


def get_default_sessions_path() -> str:
    """Get the default pi sessions path."""
    home = Path.home()
    return str(home / '.pi' / 'agent' / 'sessions')


def main():
    default_path = get_default_sessions_path()
    
    parser = argparse.ArgumentParser(
        description='🔥 Calculate token usage and costs from pi session JSONL files',
        epilog=f'Example: token-burn.py {default_path} --recursive'
    )
    
    parser.add_argument('path', nargs='?', default=default_path, 
                        help=f'Path to JSONL file or directory (default: {default_path})')
    parser.add_argument('-r', '--recursive', action='store_true', 
                        help='Recursively process directory')
    parser.add_argument('-j', '--json', action='store_true', 
                        help='Output as JSON')
    parser.add_argument('--no-costs', action='store_true',
                        help='Hide cost calculations')
    
    args = parser.parse_args()
    
    input_path = Path(args.path)
    show_costs = not args.no_costs
    
    if input_path.is_file():
        files = [input_path]
    elif input_path.is_dir():
        if args.recursive:
            files = find_session_files(str(input_path))
        else:
            files = list(input_path.glob('*.jsonl'))
    else:
        print(f"❌ Error: Path not found: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    if not files:
        print(f"❌ No JSONL files found in {input_path}", file=sys.stderr)
        sys.exit(1)
    
    # Process files
    all_results = []
    grand_total = defaultdict(lambda: {'input': 0, 'output': 0, 'cache_read': 0, 'cache_write': 0, 'total': 0})
    total_lines = 0
    total_messages = 0
    
    for filepath in files:
        try:
            result = process_jsonl_file(str(filepath))
            all_results.append(result)
            
            for model, counts in result['tokens_by_model'].items():
                grand_total[model]['input'] += counts['input']
                grand_total[model]['output'] += counts['output']
                grand_total[model]['cache_read'] += counts['cache_read']
                grand_total[model]['cache_write'] += counts['cache_write']
                grand_total[model]['total'] += counts['total']
            
            total_lines += result['lines_processed']
            total_messages += result['messages_processed']
            
        except Exception as e:
            print(f"❌ Error processing {filepath}: {e}", file=sys.stderr)
    
    # Output results
    if args.json:
        # Calculate costs for each model
        costs_by_model = {}
        for model, counts in grand_total.items():
            costs_by_model[model] = calculate_cost(counts, model)
        
        # Total costs
        total_costs = {
            'input': sum(c['input'] for c in costs_by_model.values()),
            'output': sum(c['output'] for c in costs_by_model.values()),
            'cache_read': sum(c['cache_read'] for c in costs_by_model.values()),
            'cache_write': sum(c['cache_write'] for c in costs_by_model.values()),
            'total': sum(c['total'] for c in costs_by_model.values())
        }
        
        output = {
            'files_processed': len(files),
            'total_lines': total_lines,
            'total_messages': total_messages,
            'tokens_by_model': {k: dict(v) for k, v in grand_total.items()},
            'costs_by_model': costs_by_model,
            'total_input': sum(m['input'] for m in grand_total.values()),
            'total_output': sum(m['output'] for m in grand_total.values()),
            'total_cache_read': sum(m['cache_read'] for m in grand_total.values()),
            'total_cache_write': sum(m['cache_write'] for m in grand_total.values()),
            'total_tokens': sum(m['total'] for m in grand_total.values()),
            'total_cost': total_costs
        }
        print(json.dumps(output, indent=2))
    else:
        # Beautiful table output with emojis
        print()
        print("🔥" + "═" * 68 + "🔥")
        print("║" + " " * 18 + "💰 TOKEN BURN REPORT 💰" + " " * 19 + "║")
        print("🔥" + "═" * 68 + "🔥")
        
        # Summary section
        print_table_header("📈 Session Summary")
        print_table_row("Files Processed", format_number(len(files)), "📁")
        print_table_row("Total Lines", format_number(total_lines), "📄")
        print_table_row("Messages w/ Usage", format_number(total_messages), "💬")
        print_table_footer()
        
        # Model breakdown
        sorted_models = sorted(grand_total.items(), key=lambda x: -x[1]['total'])
        
        print()
        print("📊" + "═" * 68 + "📊")
        print("║" + " " * 15 + "🤖 TOKEN USAGE BY MODEL 🤖" + " " * 18 + "║")
        print("📊" + "═" * 68 + "📊")
        
        for rank, (model, counts) in enumerate(sorted_models, 1):
            print_model_card(model, counts, rank, show_costs=show_costs)
        
        # Grand totals
        print()
        print("💰" + "═" * 68 + "💰")
        print("║" + " " * 22 + "🏆 GRAND TOTALS 🏆" + " " * 22 + "║")
        print("💰" + "═" * 68 + "💰")
        
        total_in = sum(m['input'] for m in grand_total.values())
        total_out = sum(m['output'] for m in grand_total.values())
        total_cache_r = sum(m['cache_read'] for m in grand_total.values())
        total_cache_w = sum(m['cache_write'] for m in grand_total.values())
        total_all = sum(m['total'] for m in grand_total.values())
        
        print(f"│  📥  INPUT TOKENS       {format_number(total_in):>15}  ({format_tokens(total_in)})          │")
        print(f"│  📤  OUTPUT TOKENS      {format_number(total_out):>15}  ({format_tokens(total_out)})          │")
        
        if total_cache_r > 0:
            print(f"│  💾  CACHE READ         {format_number(total_cache_r):>15}  ({format_tokens(total_cache_r)})          │")
        if total_cache_w > 0:
            print(f"│  💿  CACHE WRITE        {format_number(total_cache_w):>15}  ({format_tokens(total_cache_w)})          │")
        
        print("├" + "─" * 68 + "┤")
        print(f"│  🔥  TOTAL TOKENS       {format_number(total_all):>15}  ({format_tokens(total_all)})          │")
        
        # Total costs
        if show_costs:
            total_costs = sum(calculate_cost(m, name)['total'] for name, m in grand_total.items())
            print("├" + "─" * 68 + "┤")
            print(f"│  💵  TOTAL COST:        {format_cost(total_costs):>46} │")
        
        print("└" + "─" * 68 + "┘")
        
        # Pricing info
        if show_costs:
            print()
            print("💡" + "─" * 68 + "💡")
            print("│  📋 Pricing Notes:                                                  │")
            print("│     • Cache Read is ~90% cheaper than regular input                 │")
            print("│     • Cache Write is ~25% more expensive than regular input         │")
            print("│     • Prices based on 2025 API rates (may vary by provider)         │")
            print("│                                                                     │")
            print("│  🔍 Verify pricing at:                                              │")
            print("│     • Anthropic: console.anthropic.com/settings/pricing             │")
            print("│     • OpenAI: platform.openai.com/docs/pricing                      │")
            print("💡" + "─" * 68 + "💡")
        print()


if __name__ == '__main__':
    main()
