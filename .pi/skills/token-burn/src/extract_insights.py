#!/usr/bin/env python3
"""
Extract user insights from OpenClaw session files for agent seeding.

Analyzes all session files to build a comprehensive profile including:
- Projects and repositories worked on
- Technologies and tools used
- Topics and interests
- Work patterns and preferences
- Goals and objectives
"""

import json
import sys
import re
from pathlib import Path
from collections import defaultdict, Counter
from typing import Dict, List, Set, Tuple, Optional
from datetime import datetime
import argparse


class UserProfileExtractor:
    """Extract user insights from OpenClaw session files."""
    
    # Technology patterns to detect
    TECH_PATTERNS = {
        'languages': [
            r'\bpython\b', r'\bjavascript\b', r'\btypescript\b', r'\bjava\b', r'\bgo\b', r'\bgolang\b',
            r'\brust\b', r'\bc\+\+\b', r'\bc#\b', r'\bruby\b', r'\bphp\b', r'\bswift\b',
            r'\bkotlin\b', r'\bscala\b', r'\belixir\b', r'\bhaskell\b', r'\bclojure\b',
            r'\bsql\b', r'\bhtml\b', r'\bcss\b', r'\bsass\b', r'\bscss\b', r'\b bash\b',
            r'\bzsh\b', r'\bfish\b', r'\blua\b', r'\bperl\b', r'\br\b', r'\bmatlab\b'
        ],
        'frameworks': [
            r'\breact\b', r'\bvue\b', r'\bangular\b', r'\bsvelte\b', r'\bnext\.?js\b', r'\bnuxt\b',
            r'\bexpress\b', r'\bdjango\b', r'\bflask\b', r'\bfastapi\b', r'\bspring\b', r'\blaravel\b',
            r'\brails\b', r'\bsymfony\b', r'\bfastify\b', r'\bnest\.?js\b', r'\belectron\b',
            r'\btauri\b', r'\bflutter\b', r'\breact native\b', r'\btailwind\b', r'\bbootstrap\b'
        ],
        'databases': [
            r'\bpostgres(ql)?\b', r'\bmysql\b', r'\bmongodb\b', r'\bsqlite\b', r'\bredis\b',
            r'\belasticsearch\b', r'\bdynamodb\b', r'\bfirestore\b', r'\bcassandra\b',
            r'\bcouchdb\b', r'\bneo4j\b', r'\bmariadb\b', r'\boracle\b', r'\bsql server\b'
        ],
        'tools': [
            r'\bdocker\b', r'\bkubernetes\b', r'\bk8s\b', r'\bterraform\b', r'\bansible\b',
            r'\bjenkins\b', r'\bgitlab\b', r'\bgithub\b', r'\bbitbucket\b', r'\bvscode\b',
            r'\bvim\b', r'\bneovim\b', r'\bemacs\b', r'\bintellij\b', r'\bpycharm\b',
            r'\baws\b', r'\bgcp\b', r'\bazure\b', r'\bvercel\b', r'\bnetlify\b', r'\bheroku\b',
            r'\bnginx\b', r'\bapache\b', r'\btraefik\b', r'\bhaproxy\b'
        ],
        'ai_ml': [
            r'\btensorflow\b', r'\bpytorch\b', r'\bkeras\b', r'\bscikit[- ]learn\b', r'\bopenai\b',
            r'\bclaude\b', r'\bgpt[- ]?4\b', r'\bgpt[- ]?3\b', r'\bllama\b', r'\bmistral\b',
            r'\bhuggingface\b', r'\btransformers\b', r'\blangchain\b', r'\bvector\b.*\bdb\b',
            r'\bembedding\b', r'\bfine[- ]tun(ing|e)\b', r'\bprompt\b.*\bengineer\b'
        ],
        'testing': [
            r'\bjest\b', r'\bpytest\b', r'\bmocha\b', r'\bjasmine\b', r'\bcypress\b',
            r'\bplaywright\b', r'\bselenium\b', r'\bjunit\b', r'\btestify\b', r'\bgo test\b',
            r'\bunit test\b', r'\bintegration test\b', r'\be2e\b', r'\btdd\b', r'\bbdd\b'
        ],
        'concepts': [
            r'\bapi\b', r'\brest\b', r'\bgraphql\b', r'\bgrpc\b', r'\bwebsocket\b',
            r'\bmicroservices\b', r'\bserverless\b', r'\bmonolith\b', r'\bdistributed\b',
            r'\basync\b', r'\bconcurrent\b', r'\bparallel\b', r'\bload balancing\b',
            r'\bcaching\b', r'\bqueue\b', r'\bmessage broker\b', r'\bevent[- ]driven\b',
            r'\bci/cd\b', r'\bdevops\b', r'\bgithub actions\b', r'\bcircleci\b', r'\btravis\b'
        ]
    }
    
    def __init__(self):
        self.user_messages: List[str] = []
        self.tool_calls: List[Dict] = []
        self.tool_results: List[Dict] = []
        self.projects: Set[str] = set()
        self.repositories: Set[str] = set()
        self.files_accessed: Set[str] = set()
        self.directories_accessed: Set[str] = set()
        self.technologies: Dict[str, Counter] = defaultdict(Counter)
        self.topics: Counter = Counter()
        self.skills_used: Counter = Counter()
        self.models_used: Counter = Counter()
        self.providers_used: Counter = Counter()
        self.session_dates: List[datetime] = []
        self.conversation_starters: List[str] = []
        self.workspaces: Set[str] = set()
        self.goals: List[str] = []
        self.patterns: Dict[str, int] = defaultdict(int)
        self.thinking_levels: Counter = Counter()
        self.total_tokens: int = 0
        self.total_messages: int = 0
        self.errors_encountered: List[str] = []
        self.successes: List[str] = []
        
    def stream_jsonl_lines(self, filepath: str, buffer_size: int = 8192):
        """Stream lines from a JSONL file."""
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
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
    
    def extract_text_content(self, content: List) -> str:
        """Extract text from message content."""
        texts = []
        for item in content:
            if isinstance(item, dict):
                if 'text' in item:
                    texts.append(item['text'])
                elif 'thinking' in item:
                    texts.append(item['thinking'])
        return ' '.join(texts)
    
    def detect_technologies(self, text: str):
        """Detect technologies mentioned in text."""
        text_lower = text.lower()
        for category, patterns in self.TECH_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    tech_name = pattern.replace(r'\b', '').replace(r'\.', '.')
                    self.technologies[category][tech_name] += 1
    
    def extract_paths(self, text: str):
        """Extract file paths and directories from text."""
        # Match file paths
        file_patterns = [
            r'/[\w\-/.]+\.(py|js|ts|tsx|jsx|go|rs|java|kt|swift|rb|php|cs|cpp|c|h|hpp|sh|bash|zsh|fish|json|yaml|yml|toml|md|txt|sql|html|css|scss|sass|vue|svelte)',
            r'/[\w\-/.]+/\w+\.\w+',
        ]
        for pattern in file_patterns:
            for match in re.finditer(pattern, text):
                path = match.group(0)
                self.files_accessed.add(path)
                dir_path = '/'.join(path.split('/')[:-1])
                if dir_path:
                    self.directories_accessed.add(dir_path)
        
        # Extract workspace/project names
        workspace_pattern = r'--workspace[-\w]*--|workspace/([\w\-]+)'
        for match in re.finditer(workspace_pattern, text):
            ws = match.group(1) or match.group(0)
            self.workspaces.add(ws)
    
    def extract_goals(self, text: str):
        """Extract goals and objectives from user messages."""
        goal_patterns = [
            r'(?:i want to|i need to|goal is to|trying to|aiming to|working to)\s+(.{10,200})',
            r'(?:help me|assist me with)\s+(.{10,200})',
            r'(?:create|build|implement|develop|design|set up)\s+(?:a|an|the)?\s+(.{10,200})',
        ]
        for pattern in goal_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                goal = match.group(1).strip()
                if len(goal) > 10:
                    self.goals.append(goal)
    
    def process_file(self, filepath: str):
        """Process a single session file."""
        current_model = None
        current_provider = None
        
        for line in self.stream_jsonl_lines(filepath):
            try:
                data = json.loads(line)
                msg_type = data.get('type')
                
                # Track session start
                if msg_type == 'session':
                    ts = data.get('timestamp')
                    if ts:
                        try:
                            self.session_dates.append(datetime.fromisoformat(ts.replace('Z', '+00:00')))
                        except:
                            pass
                    continue
                
                # Track model changes
                if msg_type == 'model_change':
                    current_model = data.get('modelId')
                    current_provider = data.get('provider')
                    if current_model:
                        self.models_used[current_model] += 1
                    if current_provider:
                        self.providers_used[current_provider] += 1
                    continue
                
                # Track thinking level changes
                if msg_type == 'thinking_level_change':
                    level = data.get('thinkingLevel')
                    if level:
                        self.thinking_levels[level] += 1
                    continue
                
                # Process messages
                if msg_type == 'message':
                    msg = data.get('message', {})
                    role = msg.get('role')
                    content = msg.get('content', [])
                    text = self.extract_text_content(content)
                    
                    # Track usage
                    usage = msg.get('usage', {})
                    if usage:
                        self.total_tokens += usage.get('totalTokens', 0)
                        self.total_messages += 1
                    
                    if role == 'user' and text:
                        self.user_messages.append(text)
                        self.detect_technologies(text)
                        self.extract_paths(text)
                        self.extract_goals(text)
                        
                        # Check if this is a conversation starter (first message or new topic)
                        if len(self.user_messages) <= 5 or text.startswith('['):
                            self.conversation_starters.append(text[:300])
                        
                        # Extract topics
                        words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
                        for word in words[:5]:  # Limit to first 5 capitalized phrases
                            if len(word) > 3 and word not in ['The', 'This', 'That', 'With', 'From']:
                                self.topics[word.lower()] += 1
                    
                    elif role == 'assistant':
                        # Detect technologies in assistant responses too
                        self.detect_technologies(text)
                        self.extract_paths(text)
                
                # Track tool calls
                elif msg_type == 'toolCall':
                    tool_name = data.get('name')
                    if tool_name:
                        self.skills_used[tool_name] += 1
                        
                    # Extract paths from tool arguments
                    args = data.get('arguments', {})
                    if isinstance(args, dict):
                        for value in args.values():
                            if isinstance(value, str) and value.startswith('/'):
                                self.files_accessed.add(value)
                
                # Track tool results for success/failure patterns
                elif msg_type == 'toolResult':
                    details = data.get('details', {})
                    if isinstance(details, dict):
                        status = details.get('status')
                        if status == 'error':
                            error = details.get('error', '')
                            if error:
                                self.errors_encountered.append(error[:200])
                        elif status == 'completed':
                            content = data.get('content', [])
                            if content and isinstance(content, list):
                                text_content = str(content[0])[:100] if content else ''
                                if text_content:
                                    self.successes.append(text_content)
                
            except json.JSONDecodeError:
                continue
            except Exception as e:
                continue
    
    def find_session_files(self, base_path: str) -> List[Path]:
        """Find all JSONL session files."""
        base = Path(base_path)
        files = list(base.glob('**/*.jsonl'))
        return sorted(files)
    
    def analyze(self, base_path: str):
        """Analyze all session files."""
        files = self.find_session_files(base_path)
        print(f"Processing {len(files)} session files...", file=sys.stderr)
        
        for i, filepath in enumerate(files, 1):
            if i % 20 == 0:
                print(f"  Processed {i}/{len(files)} files...", file=sys.stderr)
            self.process_file(str(filepath))
        
        print(f"Done! Analyzed {len(files)} files.", file=sys.stderr)
    
    def generate_profile(self) -> Dict:
        """Generate a comprehensive user profile."""
        return {
            'overview': {
                'total_sessions': len(self.session_dates),
                'date_range': {
                    'first': min(self.session_dates).isoformat() if self.session_dates else None,
                    'last': max(self.session_dates).isoformat() if self.session_dates else None,
                },
                'total_messages': self.total_messages,
                'total_tokens': self.total_tokens,
            },
            'workspaces': sorted(list(self.workspaces))[:20],
            'models': dict(self.models_used.most_common(10)),
            'providers': dict(self.providers_used.most_common(5)),
            'thinking_levels': dict(self.thinking_levels.most_common()),
            'technologies': {
                category: dict(counter.most_common(15))
                for category, counter in self.technologies.items()
                if counter
            },
            'top_topics': dict(self.topics.most_common(20)),
            'skills_used': dict(self.skills_used.most_common(15)),
            'projects': self._identify_projects(),
            'goals': self.goals[:20],
            'work_patterns': self._analyze_patterns(),
            'conversation_samples': self.conversation_starters[:10],
            'common_errors': Counter(self.errors_encountered).most_common(10),
        }
    
    def _identify_projects(self) -> List[Dict]:
        """Identify projects from directories and files."""
        projects = []
        
        # Group files by directory depth
        project_dirs = defaultdict(list)
        for path in self.directories_accessed:
            parts = path.split('/')
            if len(parts) >= 4:
                # Assume project is at workspace level
                project_key = '/'.join(parts[:5]) if len(parts) >= 5 else path
                project_dirs[project_key].append(path)
        
        # Sort by number of files
        for project_path, files in sorted(project_dirs.items(), key=lambda x: -len(x[1]))[:15]:
            projects.append({
                'path': project_path,
                'activity_count': len(files),
            })
        
        return projects
    
    def _analyze_patterns(self) -> Dict:
        """Analyze work patterns."""
        return {
            'avg_message_length': sum(len(m) for m in self.user_messages) / len(self.user_messages) if self.user_messages else 0,
            'uses_detailed_requests': sum(1 for m in self.user_messages if len(m) > 500) / len(self.user_messages) if self.user_messages else 0,
            'prefers_code_examples': 'code' in str(self.user_messages).lower(),
            'focus_areas': list(self.technologies.keys()),
        }
    
    def generate_agent_seed_text(self) -> str:
        """Generate text for seeding a new agent."""
        profile = self.generate_profile()
        
        lines = []
        lines.append("=" * 70)
        lines.append("USER PROFILE FOR AGENT SEEDING")
        lines.append("=" * 70)
        lines.append("")
        
        # Overview
        overview = profile['overview']
        lines.append("## OVERVIEW")
        lines.append(f"- Sessions analyzed: {overview['total_sessions']}")
        lines.append(f"- Date range: {overview['date_range']['first'][:10] if overview['date_range']['first'] else 'N/A'} to {overview['date_range']['last'][:10] if overview['date_range']['last'] else 'N/A'}")
        lines.append(f"- Total messages: {overview['total_messages']:,}")
        lines.append(f"- Total tokens: {overview['total_tokens']:,}")
        lines.append("")
        
        # Workspaces
        if profile['workspaces']:
            lines.append("## WORKSPACES")
            for ws in profile['workspaces'][:10]:
                lines.append(f"- {ws}")
            lines.append("")
        
        # Preferred Models
        if profile['models']:
            lines.append("## PREFERRED MODELS")
            for model, count in profile['models'].items():
                lines.append(f"- {model}: {count} sessions")
            lines.append("")
        
        # Technologies
        if profile['technologies']:
            lines.append("## TECHNOLOGY STACK")
            for category, techs in profile['technologies'].items():
                lines.append(f"\n### {category.upper()}")
                for tech, count in list(techs.items())[:10]:
                    lines.append(f"- {tech}: {count} mentions")
            lines.append("")
        
        # Projects
        if profile['projects']:
            lines.append("## ACTIVE PROJECTS")
            for proj in profile['projects'][:10]:
                lines.append(f"- {proj['path']} ({proj['activity_count']} activities)")
            lines.append("")
        
        # Skills Used
        if profile['skills_used']:
            lines.append("## TOOLS & SKILLS FREQUENTLY USED")
            for skill, count in profile['skills_used'].items():
                lines.append(f"- {skill}: {count} uses")
            lines.append("")
        
        # Goals
        if profile['goals']:
            lines.append("## RECENT GOALS & OBJECTIVES")
            for goal in profile['goals'][:10]:
                lines.append(f"- {goal}")
            lines.append("")
        
        # Work Patterns
        patterns = profile['work_patterns']
        lines.append("## WORK PATTERNS")
        lines.append(f"- Average request length: {patterns['avg_message_length']:.0f} characters")
        lines.append(f"- Detailed requests: {'Yes' if patterns['uses_detailed_requests'] > 0.3 else 'No'}")
        lines.append(f"- Focus areas: {', '.join(patterns['focus_areas'][:5])}")
        lines.append("")
        
        # Sample Conversations
        if profile['conversation_samples']:
            lines.append("## SAMPLE CONVERSATION STARTERS")
            for i, sample in enumerate(profile['conversation_samples'][:5], 1):
                lines.append(f"\n{i}. {sample[:200]}...")
            lines.append("")
        
        lines.append("=" * 70)
        lines.append("END OF PROFILE")
        lines.append("=" * 70)
        
        return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(
        description='Extract user insights from OpenClaw session files'
    )
    parser.add_argument('path', nargs='?', default='/workspace/openclaw-sessions',
                        help='Path to session files directory')
    parser.add_argument('--json', action='store_true',
                        help='Output as JSON')
    parser.add_argument('--seed', action='store_true',
                        help='Generate agent seed text')
    parser.add_argument('--output', '-o',
                        help='Output file (default: stdout)')
    
    args = parser.parse_args()
    
    extractor = UserProfileExtractor()
    extractor.analyze(args.path)
    
    if args.seed:
        output = extractor.generate_agent_seed_text()
    elif args.json:
        import json
        output = json.dumps(extractor.generate_profile(), indent=2)
    else:
        # Default to seed text
        output = extractor.generate_agent_seed_text()
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(output)
        print(f"Output written to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == '__main__':
    main()
