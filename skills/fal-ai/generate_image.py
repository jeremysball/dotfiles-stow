#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "fal-client>=0.5.0",
#     "pillow>=10.0.0",
#     "httpx>=0.27.0",
# ]
# ///

"""Generate images using fal.ai API with Flux, Recraft, and other models."""

import os
import sys
import json
import base64
import argparse
import re
from pathlib import Path
from datetime import datetime, timedelta
from urllib.parse import quote

import fal_client
import httpx
from PIL import Image
import io


# Cache file for pricing
CACHE_DIR = Path.home() / ".cache" / "skills" / "fal-ai"
CACHE_FILE = CACHE_DIR / "models.jsonl"
CACHE_EXPIRY_HOURS = 24

# Known model endpoints (we'll fetch pricing dynamically)
MODEL_ENDPOINTS = {
    # Recraft models
    "recraft-v4": "fal-ai/recraft/v4/text-to-image",
    "recraft-v4-pro": "fal-ai/recraft/v4/pro/text-to-image",
    "recraft-vector": "fal-ai/recraft/v4/text-to-vector",
    "recraft-v3": "fal-ai/recraft/v3/text-to-image",
    # Flux 2 models
    "flux2-klein": "fal-ai/flux-2/klein/4b/distilled",
    "flux2-klein-base": "fal-ai/flux-2/klein/4b/base",
    "flux2-klein-9b": "fal-ai/flux-2/klein/9b/base",
    # Flux 1 models
    "flux-dev": "fal-ai/flux/dev",
    "flux-pro": "fal-ai/flux-pro/new",
    "flux-schnell": "fal-ai/flux/schnell",
    "flux-realism": "fal-ai/flux-realism",
    # Imagen
    "imagen4": "fal-ai/imagen4",
    # Fast options
    "fast-sdxl": "fal-ai/fast-sdxl",
    "fast-lightning-sdxl": "fal-ai/fast-lightning-sdxl",
    # Aliases
    "flux-klein": "fal-ai/flux-2/klein/4b/distilled",
}

# Model descriptions
MODEL_DESCRIPTIONS = {
    "recraft-v4": "Best for logos, banners, design assets",
    "recraft-v4-pro": "Pro version, highest quality design",
    "recraft-vector": "SVG vector output for logos/icons",
    "recraft-v3": "Previous version, still excellent",
    "flux2-klein": "Flux 2 klein, fastest & cheapest",
    "flux2-klein-base": "Flux 2 klein base, higher quality",
    "flux2-klein-9b": "Flux 2 klein 9B, best quality klein",
    "flux-dev": "Best value for quality, open weights",
    "flux-pro": "Highest quality Flux 1 model",
    "flux-schnell": "Very fast, good quality",
    "flux-realism": "Enhanced photorealism",
    "imagen4": "Google's Imagen 4 model",
    "fast-sdxl": "Fast Stable Diffusion XL",
    "fast-lightning-sdxl": "Ultra fast SDXL variant",
    "flux-klein": "Alias for flux2-klein",
}


def load_cached_pricing() -> dict:
    """Load cached pricing data from JSONL file"""
    if not CACHE_FILE.exists():
        return {}
    
    pricing = {}
    try:
        with open(CACHE_FILE) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    endpoint = entry.get('endpoint')
                    if endpoint:
                        # Check if entry is still valid
                        cached_time = datetime.fromisoformat(entry.get('timestamp', '2000-01-01'))
                        if datetime.now() - cached_time < timedelta(hours=CACHE_EXPIRY_HOURS):
                            pricing[endpoint] = entry
                except json.JSONDecodeError:
                    continue
    except Exception:
        pass
    
    return pricing


def save_pricing_entry(endpoint: str, data: dict):
    """Append a pricing entry to the JSONL cache"""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    
    # Add timestamp
    data['endpoint'] = endpoint
    data['timestamp'] = datetime.now().isoformat()
    
    # Read existing entries, update if exists, append if new
    entries = {}
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE) as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            entry = json.loads(line)
                            entries[entry.get('endpoint', '')] = entry
                        except:
                            pass
        except:
            pass
    
    # Update/add this entry
    entries[endpoint] = data
    
    # Write all entries back
    with open(CACHE_FILE, 'w') as f:
        for entry in entries.values():
            f.write(json.dumps(entry) + '\n')


def fetch_model_pricing(endpoint: str, cached: dict) -> dict:
    """Fetch pricing info from fal.ai llms.txt, using cache if valid"""
    # Check cache first
    if endpoint in cached:
        entry = cached[endpoint]
        cached_time = datetime.fromisoformat(entry.get('timestamp', '2000-01-01'))
        if datetime.now() - cached_time < timedelta(hours=CACHE_EXPIRY_HOURS):
            return entry
    
    # Fetch fresh data
    url = f"https://fal.ai/models/{endpoint}/llms.txt"
    try:
        resp = httpx.get(url, timeout=10, follow_redirects=True)
        if resp.status_code != 200:
            return cached.get(endpoint)
        
        content = resp.text
        
        # Parse pricing from the markdown
        pricing = {'endpoint': endpoint}
        
        # Look for "Price: $X per Y" patterns
        price_match = re.search(r'\*\*Price\*\*:\s*\$?([\d.]+)\s+per\s+(\w+)', content, re.IGNORECASE)
        if price_match:
            pricing['price'] = float(price_match.group(1))
            pricing['unit'] = price_match.group(2)
        
        # Look for "$X per megapixel" patterns
        mp_match = re.search(r'\$([\d.]+)\s+per\s+megapixel', content, re.IGNORECASE)
        if mp_match:
            pricing['price'] = float(mp_match.group(1))
            pricing['unit'] = 'megapixel'
        
        # Look for "first megapixel" pricing
        first_mp = re.search(r'first megapixel.*?\$([\d.]+)', content, re.IGNORECASE)
        if first_mp and 'price' not in pricing:
            pricing['price'] = float(first_mp.group(1))
            pricing['unit'] = 'megapixel'
        
        # Look for additional pricing info
        additional_mp = re.search(r'additional.*?megapixel.*?\$([\d.]+)', content, re.IGNORECASE)
        if additional_mp:
            pricing['price_additional_mp'] = float(additional_mp.group(1))
        
        # Save to cache
        if 'price' in pricing:
            save_pricing_entry(endpoint, pricing)
        
        return pricing if 'price' in pricing else cached.get(endpoint)
        
    except Exception:
        return cached.get(endpoint)


def get_all_pricing(force_refresh: bool = False) -> dict:
    """Get pricing for all models, using cache if valid (24h expiry)"""
    # Load cached data
    cached = load_cached_pricing()
    
    # If force refresh, clear cache and fetch fresh
    if force_refresh:
        cached = {}
    
    pricing = {}
    
    for name, endpoint in MODEL_ENDPOINTS.items():
        if name in pricing:  # Skip aliases
            continue
            
        info = fetch_model_pricing(endpoint, cached)
        if info and 'price' in info:
            pricing[name] = {
                'endpoint': endpoint,
                'price': info.get('price', 0),
                'unit': info.get('unit', 'image'),
                'desc': MODEL_DESCRIPTIONS.get(name, '')
            }
    
    # Handle aliases
    for name, endpoint in MODEL_ENDPOINTS.items():
        if name not in pricing:
            # Find the model this aliases to
            for other_name, other_endpoint in MODEL_ENDPOINTS.items():
                if endpoint == other_endpoint and other_name in pricing:
                    pricing[name] = pricing[other_name].copy()
                    break
    
    return pricing


def check_usage(days: int = 7):
    """Check usage via fal.ai API (requires admin key)"""
    # Prefer admin key for usage, fall back to regular key
    api_key = os.environ.get("FAL_KEY_ADMIN") or os.environ.get("FAL_KEY") or os.environ.get("FAL_KEY")
    if not api_key:
        print("❌ FAL_KEY_ADMIN or FAL_KEY not set")
        return
    
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    try:
        resp = httpx.get(
            'https://api.fal.ai/v1/models/usage',
            headers={'Authorization': f'Key {api_key}'},
            params={
                'expand': 'summary',
                'start': start_date,
            },
            timeout=30
        )
        
        if resp.status_code == 403:
            print("❌ Usage API requires an ADMIN key (FAL_KEY_ADMIN).")
            print("\n📋 To check your balance and usage:")
            print("   1. Go to: https://fal.ai/dashboard")
            print("   2. Or create an admin key at: https://fal.ai/dashboard/keys")
            print("\n💡 Set FAL_KEY_ADMIN environment variable with your admin key.")
            return
        
        if resp.status_code != 200:
            print(f"❌ API error: {resp.status_code}")
            print(resp.text[:500])
            return
        
        data = resp.json()
        summary = data.get('summary', [])
        
        if not summary:
            print(f"✅ No usage in the last {days} days")
            return
        
        print(f"\n📊 Usage Summary (last {days} days):\n")
        print(f"{'Model':<40} {'Units':<10} {'Cost':<10}")
        print("─" * 60)
        
        total_cost = 0
        for item in summary:
            endpoint = item.get('endpoint_id', 'unknown')
            quantity = item.get('quantity', 0)
            cost = item.get('cost', 0)
            currency = item.get('currency', 'USD')
            total_cost += cost
            # Shorten endpoint name for display
            if endpoint.startswith('fal-ai/'):
                endpoint = endpoint[7:]
            print(f"{endpoint:<40} {quantity:<10.0f} ${cost:<9.2f}")
        
        print("─" * 60)
        print(f"{'TOTAL':<40} {'':<10} ${total_cost:.2f}")
        print()
        
    except Exception as e:
        print(f"❌ Error: {e}")


def generate_image(
    prompt: str,
    output_path: str,
    model: str = None,
    endpoint: str = None,
    aspect_ratio: str = None,
    width: int = None,
    height: int = None,
    seed: int = None,
    num_images: int = 1,
    **extra_args,
) -> tuple[list[str], float]:
    """
    Generate images using fal.ai API.
    """
    # Check for API key
    api_key = os.environ.get("FAL_KEY") or os.environ.get("FAL_KEY")
    if not api_key:
        raise ValueError("FAL_KEY or FAL_KEY environment variable is not set")
    
    # Set FAL_KEY for fal_client
    os.environ["FAL_KEY"] = api_key
    
    # Get pricing info
    pricing = get_all_pricing()
    
    # Determine endpoint
    is_vector = False
    price_per_unit = 0.02
    
    if endpoint:
        api_endpoint = endpoint
    elif model and model in pricing:
        api_endpoint = pricing[model]['endpoint']
        price_per_unit = pricing[model].get('price', 0.02)
        is_vector = 'vector' in model.lower()
    elif model and model in MODEL_ENDPOINTS:
        api_endpoint = MODEL_ENDPOINTS[model]
    elif model:
        # Treat model as endpoint directly
        api_endpoint = f"fal-ai/{model}" if not model.startswith("fal-ai/") else model
    else:
        raise ValueError("Either model or endpoint must be specified")
    
    # Build arguments
    arguments = {"prompt": prompt}
    
    # Handle dimensions
    if width and height:
        arguments["image_size"] = {"width": width, "height": height}
    elif aspect_ratio:
        arguments["aspect_ratio"] = aspect_ratio
    
    if seed is not None:
        arguments["seed"] = seed
    
    if num_images > 1:
        arguments["num_images"] = num_images
    
    # Add any extra arguments
    arguments.update(extra_args)
    
    # Call fal.ai API
    try:
        result = fal_client.subscribe(
            api_endpoint,
            arguments=arguments,
        )
    except Exception as e:
        raise RuntimeError(f"API call failed: {e}")
    
    # Process results
    saved_paths = []
    
    # Handle different response formats
    if isinstance(result, dict):
        images = result.get("images", [result.get("image")])
        if not images[0]:
            images = [result]
    else:
        images = [result]
    
    for i, img_data in enumerate(images):
        try:
            # Get image bytes
            if isinstance(img_data, dict):
                if "url" in img_data:
                    response = httpx.get(img_data["url"], timeout=30)
                    image_bytes = response.content
                elif "content" in img_data:
                    image_bytes = base64.b64decode(img_data["content"])
                elif "blob" in img_data:
                    image_bytes = base64.b64decode(img_data["blob"])
                else:
                    print(f"Warning: Unknown format, keys: {list(img_data.keys())}", file=sys.stderr)
                    continue
            elif isinstance(img_data, str):
                if img_data.startswith("http"):
                    response = httpx.get(img_data, timeout=30)
                    image_bytes = response.content
                else:
                    image_bytes = base64.b64decode(img_data)
            else:
                print(f"Warning: Unknown data type: {type(img_data)}", file=sys.stderr)
                continue
            
            # Determine output path
            if num_images == 1:
                path = output_path
            else:
                base, ext = os.path.splitext(output_path)
                path = f"{base}_{i+1}{ext}" if ext else f"{base}_{i+1}.png"
            
            # Save
            if is_vector or path.endswith(".svg"):
                with open(path, "wb") as f:
                    f.write(image_bytes)
            else:
                image = Image.open(io.BytesIO(image_bytes))
                image.save(path)
            
            saved_paths.append(path)
            
        except Exception as e:
            print(f"Error saving image {i+1}: {e}", file=sys.stderr)
    
    estimated_cost = price_per_unit * len(saved_paths)
    return saved_paths, estimated_cost


def list_models(force_refresh: bool = False):
    """Print available model presets with live pricing."""
    if force_refresh:
        print("Refreshing pricing from fal.ai...", file=sys.stderr)
    
    pricing = get_all_pricing(force_refresh)
    
    print("\n📚 Available Models (pricing from fal.ai):\n")
    print(f"{'Model':<22} {'Price':<20} Description")
    print("─" * 85)
    
    # Group by category
    categories = {
        "★ Recommended": ["recraft-v4", "flux2-klein", "recraft-vector"],
        "🎨 Design & Logos": ["recraft-v4-pro", "recraft-v3"],
        "🖼️  Art & Photorealism": ["flux-dev", "flux-pro", "flux-schnell", "flux-realism", "imagen4"],
        "⚡ Fast & Cheap": ["flux2-klein", "flux2-klein-base", "fast-sdxl", "fast-lightning-sdxl"],
    }
    
    shown = set()
    for category, models in categories.items():
        print(f"\n{category}")
        for name in models:
            if name in pricing and name not in shown:
                info = pricing[name]
                price_str = f"${info['price']}/{info['unit']}"
                print(f"  {name:<20} {price_str:<20} {info.get('desc', '')}")
                shown.add(name)
    
    print("\n💡 Usage: -m <model_name> or --endpoint fal-ai/custom/model")
    print("   Use --refresh-prices to fetch latest pricing from fal.ai")
    print(f"   Cache: {CACHE_FILE}")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Generate images using fal.ai API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate image
  uv run generate_image.py "A sunset over mountains" sunset.png -m recraft-v4
  
  # Check usage
  uv run generate_image.py --usage
  
  # Refresh pricing
  uv run generate_image.py --refresh-prices
"""
    )
    parser.add_argument("prompt", nargs="?", help="Text prompt for image generation")
    parser.add_argument("output", nargs="?", default="generated_image.png", help="Output file path")
    parser.add_argument("-m", "--model", default="recraft-v4", help="Model preset name")
    parser.add_argument("-e", "--endpoint", help="Direct API endpoint (overrides model)")
    parser.add_argument("-a", "--aspect-ratio", help="Aspect ratio (1:1, 16:9, 9:16, etc.)")
    parser.add_argument("-W", "--width", type=int, help="Image width in pixels")
    parser.add_argument("-H", "--height", type=int, help="Image height in pixels")
    parser.add_argument("-s", "--seed", type=int, help="Random seed for reproducibility")
    parser.add_argument("-n", "--num-images", type=int, default=1, help="Number of images")
    parser.add_argument("--extra", action="append", help="Extra key=value args for model")
    
    # Pricing and usage commands
    parser.add_argument("--list-models", action="store_true", help="List available models with pricing")
    parser.add_argument("--refresh-prices", action="store_true", help="Refresh pricing from fal.ai")
    parser.add_argument("--usage", action="store_true", help="Check usage (requires admin key)")
    parser.add_argument("--usage-days", type=int, default=7, help="Days of usage to show")
    
    args = parser.parse_args()
    
    # Handle commands
    if args.refresh_prices:
        get_all_pricing(force_refresh=True)
        list_models(force_refresh=True)
        sys.exit(0)
    
    if args.list_models:
        list_models()
        sys.exit(0)
    
    if args.usage:
        check_usage(days=args.usage_days)
        sys.exit(0)
    
    if not args.prompt:
        parser.print_help()
        print("\n❌ Error: prompt is required (or use --list-models, --usage)")
        sys.exit(1)
    
    # Parse extra args
    extra_args = {}
    if args.extra:
        for kv in args.extra:
            if "=" in kv:
                k, v = kv.split("=", 1)
                # Try to parse as number or bool
                if v.lower() == "true":
                    v = True
                elif v.lower() == "false":
                    v = False
                else:
                    try:
                        v = int(v)
                    except ValueError:
                        try:
                            v = float(v)
                        except ValueError:
                            pass
                extra_args[k] = v
    
    try:
        paths, cost = generate_image(
            prompt=args.prompt,
            output_path=args.output,
            model=args.model,
            endpoint=args.endpoint,
            aspect_ratio=args.aspect_ratio,
            width=args.width,
            height=args.height,
            seed=args.seed,
            num_images=args.num_images,
            **extra_args,
        )
        
        print(f"\n✅ Generated {len(paths)} image(s)")
        print(f"💰 Estimated cost: ${cost:.4f}")
        for path in paths:
            print(f"📁 Saved: {path}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
