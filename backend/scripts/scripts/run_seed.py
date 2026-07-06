import asyncio
import json
import os
import sys
import uuid
import re
from pathlib import Path

# Add project root to sys.path and load environment variables
def find_project_root():
    current = Path(__file__).resolve().parent
    for _ in range(5):
        if (current / ".env").exists() or (current / "app").exists():
            return current
        current = current.parent
    return Path(__file__).resolve().parent.parent.parent

PROJECT_ROOT = find_project_root()
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Load .env BEFORE importing app modules
from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

from sqlalchemy import select
from app.database import async_session_factory
from app.models.category import Category
from app.models.product import Product
from app.models.pricing import VendorPricing, RetailerPricing

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

async def seed_data():
    json_path = Path(__file__).resolve().parent / "seed_categories.json"
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    async with async_session_factory() as session:
        # Helper to get or create category
        async def get_or_create_category(name: str, parent_id: uuid.UUID = None, depth: int = 0, is_wholesale: bool = False, is_retail: bool = False):
            category_images = {
                "electronics": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&q=80",
                "mobile & accessories": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80",
                "computer & accessories": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80",
                "computer accessories": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80",
                "home electronics": "https://images.unsplash.com/photo-1558882224-cca166733360?w=500&q=80",
                "home electronic": "https://images.unsplash.com/photo-1558882224-cca166733360?w=500&q=80",
                "clothes": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&q=80",
                "clothing & fashion": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&q=80",
                "men": "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=500&q=80",
                "women": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=500&q=80",
                "children": "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=500&q=80",
                "kids": "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=500&q=80",
                "fashion essential": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&q=80",
                "grocery": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80",
                "daily essential": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80",
                "dry fruits": "https://images.unsplash.com/photo-1596003906949-67221c37e1f6?w=500&q=80",
                "spices": "https://images.unsplash.com/photo-1596003906949-67221c37e1f6?w=500&q=80",
                "spices whole": "https://images.unsplash.com/photo-1596003906949-67221c37e1f6?w=500&q=80",
                "seeds": "https://images.unsplash.com/photo-1608797178974-15b35a61d121?w=500&q=80",
                "pooja item": "https://images.unsplash.com/photo-1609137144813-2d2bc7ff6538?w=500&q=80",
                "herbs": "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=500&q=80",
                "worship item": "https://images.unsplash.com/photo-1609137144813-2d2bc7ff6538?w=500&q=80",
                "herbs & ayurvedic": "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=500&q=80",
                "dairy product": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&q=80",
                "oil & ghee": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80",
                "whole spices and other grocery items": "https://images.unsplash.com/photo-1596003906949-67221c37e1f6?w=500&q=80",
                "snacks & beverages": "https://images.unsplash.com/photo-1534080391025-a7f0e67c23e6?w=500&q=80",
                "personal care": "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&q=80",
                "home & kitchen": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500&q=80",
            }
            name_lower = name.lower()
            matching_url = None
            for key, url in category_images.items():
                if key in name_lower:
                    matching_url = url
                    break
            if not matching_url:
                matching_url = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80"

            stmt = select(Category).where(Category.name == name, Category.parent_id == parent_id)
            result = await session.execute(stmt)
            cat = result.scalar_one_or_none()
            if cat:
                # Update visibility to merge overlaps
                if is_wholesale: cat.visible_to_vendor = True
                if is_retail: cat.visible_to_retailer = True
                if not cat.image_url:
                    cat.image_url = matching_url
                await session.flush()
                return cat
            
            # Create new
            base_slug = slugify(name)
            if not base_slug: base_slug = f"cat-{uuid.uuid4().hex[:6]}"
            slug = base_slug
            counter = 1
            while True:
                existing = (await session.execute(select(Category).where(Category.slug == slug))).scalar_one_or_none()
                if not existing:
                    break
                slug = f"{base_slug}-{counter}"
                counter += 1
                
            cat = Category(
                name=name,
                slug=slug,
                parent_id=parent_id,
                depth=depth,
                visible_to_vendor=is_wholesale,
                visible_to_retailer=is_retail,
                image_url=matching_url
            )
            session.add(cat)
            await session.flush()
            return cat

        def get_pricing_for_product(name: str):
            name_lower = name.lower()
            base = 999  # INR 9.99
            vendor = 699
            retailer = 849
            mapping = {
                "smart watch": (2999, 1999, 2499),
                "smartwatch": (2999, 1999, 2499),
                "watch": (1999, 1299, 1699),
                "charger": (999, 599, 799),
                "earphone": (1499, 899, 1199),
                "headphone": (2499, 1499, 1999),
                "power bank": (1999, 1299, 1599),
                "keyboard": (1499, 999, 1249),
                "mouse": (799, 499, 649),
                "storage": (1299, 799, 1049),
                "cooler": (5999, 3999, 4999),
                "fan": (2199, 1499, 1799),
                "heater": (1899, 1199, 1499),
                "hair dryer": (1299, 799, 999),
                "trimmer": (1499, 899, 1199),
                "laptop": (45000, 38000, 41000),
                "tv": (24999, 19999, 21999),
                "ac": (34999, 28999, 31999),
                "refrigerator": (18999, 14999, 16999),
                "washing machine": (15999, 12999, 14499),
                "tshirt": (599, 349, 449),
                "shirt": (999, 599, 799),
                "jeans": (1499, 899, 1199),
                "trousers": (1199, 699, 949),
                "sarees": (2499, 1499, 1999),
                "kurti": (899, 499, 699),
                "suits": (2999, 1899, 2399),
                "tops": (699, 399, 549),
                "dresses": (1499, 899, 1199),
                "belt": (499, 249, 349),
                "bag": (1499, 899, 1199),
                "sunglasses": (999, 549, 749),
                "atta": (450, 380, 410),
                "rice": (380, 300, 340),
                "pulse": (180, 140, 160),
                "oil": (160, 130, 145),
                "ghee": (650, 550, 600),
                "salt": (28, 22, 25),
                "almond": (900, 750, 820),
                "cashew": (800, 650, 720),
                "raisin": (300, 220, 260),
                "turmeric": (250, 180, 210),
                "coriander": (200, 140, 170),
                "chilli": (300, 220, 260),
                "havan": (150, 90, 120),
                "shikakai": (120, 80, 100),
                "soapnut": (140, 90, 110),
                "paneer": (400, 320, 365),
                "butter": (500, 420, 460),
                "curd": (80, 60, 70),
                "cream": (220, 170, 195),
                "sugar": (50, 40, 45),
                "dates": (250, 180, 215),
                "star anise": (600, 450, 520),
                "cloves": (900, 700, 800),
                "cinnamon": (400, 300, 350),
                "namkeen": (150, 110, 130),
                "biscuits": (120, 90, 105),
                "bisket": (120, 90, 105),
                "soft drink": (90, 70, 80),
                "rasgalla": (250, 180, 210),
                "peanuts": (180, 130, 155),
            }
            for key, (b, v, r) in mapping.items():
                if key in name_lower:
                    base, vendor, retailer = b, v, r
                    break
            return base * 100, vendor * 100, retailer * 100

        async def get_or_create_product(name: str, category_id: uuid.UUID, sub_category_id: uuid.UUID = None):
            resolved_base, resolved_vendor, resolved_retailer = get_pricing_for_product(name)
            stmt = select(Product).where(Product.name == name, Product.category_id == category_id)
            result = await session.execute(stmt)
            prod = result.scalar_one_or_none()
            if prod:
                if prod.base_price == 0:
                    prod.base_price = resolved_base
                    await session.flush()
                # Check pricing records
                stmt_v = select(VendorPricing).where(VendorPricing.product_id == prod.id)
                vp = (await session.execute(stmt_v)).scalar_one_or_none()
                if not vp:
                    session.add(VendorPricing(product_id=prod.id, price=resolved_vendor))
                elif vp.price == 0:
                    vp.price = resolved_vendor
                
                stmt_r = select(RetailerPricing).where(RetailerPricing.product_id == prod.id)
                rp = (await session.execute(stmt_r)).scalar_one_or_none()
                if not rp:
                    session.add(RetailerPricing(product_id=prod.id, price=resolved_retailer))
                elif rp.price == 0:
                    rp.price = resolved_retailer
                await session.flush()
                return prod
            
            base_slug = slugify(name)
            if not base_slug: base_slug = f"prod-{uuid.uuid4().hex[:6]}"
            slug = base_slug
            counter = 1
            while True:
                existing = (await session.execute(select(Product).where(Product.slug == slug))).scalar_one_or_none()
                if not existing:
                    break
                slug = f"{base_slug}-{counter}"
                counter += 1

            # Generate unique SKU
            sku = f"SKU-{uuid.uuid4().hex[:8].upper()}"

            prod = Product(
                name=name,
                slug=slug,
                sku=sku,
                base_price=resolved_base,
                category_id=category_id,
                sub_category_id=sub_category_id,
                gst_rate=18,
                stock_qty=100,
                unit="piece"
            )
            session.add(prod)
            await session.flush()

            session.add(VendorPricing(product_id=prod.id, price=resolved_vendor))
            session.add(RetailerPricing(product_id=prod.id, price=resolved_retailer))
            await session.flush()
            return prod

        print("Processing Wholesale Categories...")
        for parent_name, subcategories in data.get("wholesale", {}).items():
            parent_cat = await get_or_create_category(parent_name, None, 0, is_wholesale=True, is_retail=False)
            for sub_name, items in subcategories.items():
                sub_cat = await get_or_create_category(sub_name, parent_cat.id, 1, is_wholesale=True, is_retail=False)
                for item in items:
                    await get_or_create_product(item, parent_cat.id, sub_cat.id)

        print("Processing Retail Categories...")
        for parent_name, subcategories in data.get("retail", {}).items():
            parent_cat = await get_or_create_category(parent_name, None, 0, is_wholesale=False, is_retail=True)
            for sub_name, items in subcategories.items():
                sub_cat = await get_or_create_category(sub_name, parent_cat.id, 1, is_wholesale=False, is_retail=True)
                for item in items:
                    await get_or_create_product(item, parent_cat.id, sub_cat.id)

        print("Processing Combined Grocery Catalog (Visible to both)...")
        # Ensure Grocery parent exists for both
        grocery_parent = await get_or_create_category("Grocery", None, 0, is_wholesale=True, is_retail=True)
        
        for sub_name, items in data.get("grocery_catalog", {}).items():
            sub_cat = await get_or_create_category(sub_name, grocery_parent.id, 1, is_wholesale=True, is_retail=True)
            for item in items:
                await get_or_create_product(item, grocery_parent.id, sub_cat.id)

        await session.commit()
        print("Successfully seeded all categories and products!")

if __name__ == "__main__":
    asyncio.run(seed_data())
