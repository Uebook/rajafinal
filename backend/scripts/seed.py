"""
Seed script — P1-06.

Creates: 1 Super Admin, sample categories, sample products, 1 Vendor, 1 Retailer.
Credentials from .env.test or .env.
"""

import asyncio
import uuid
import sys
from pathlib import Path

# Add project root to sys.path and load environment variables
def find_project_root():
    current = Path(__file__).resolve().parent
    for _ in range(5):
        if (current / ".env").exists() or (current / "app").exists():
            return current
        current = current.parent
    return Path(__file__).resolve().parent.parent

PROJECT_ROOT = find_project_root()
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

from sqlalchemy import select

from app.config import get_settings
from app.database import async_session_factory, engine, Base
from app.models.user import User, UserRole, UserStatus
from app.models.vendor import Vendor
from app.models.retailer import Retailer
from app.models.category import Category
from app.models.product import Product, ProductStatus, ProductImage
from app.models.pricing import VendorPricing, RetailerPricing
from app.models.ledger import LedgerEntry, LedgerType
from app.models.order import Order, OrderItem, OrderStatus
from app.utils.security import hash_password
from app.utils.slug import generate_unique_slug

settings = get_settings()


async def seed():
    """Run seed data insertion."""
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        # ── 1. Super Admin ───────────────────────────────────
        existing = await db.execute(
            select(User).where(User.role == UserRole.SUPER_ADMIN, User.is_deleted == False)  # noqa: E712
        )
        if not existing.scalar_one_or_none():
            super_admin = User(
                mobile=settings.super_admin_mobile,
                email=settings.super_admin_email,
                full_name="Super Admin",
                role=UserRole.SUPER_ADMIN,
                status=UserStatus.ACTIVE,
                is_verified=True,
                password_hash=hash_password(settings.super_admin_password),
            )
            db.add(super_admin)
            await db.flush()
            print(f"[SEED] Super Admin created: {settings.super_admin_email}")

        # ── 2. Categories & Subcategories ────────────────────
        # Parent Categories
        parent_cats_data = [
            {
                "name": "Grocery",
                "desc": "Daily essentials, grains, dry fruits, spices, and pooja items.",
                "image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
            },
            {
                "name": "Electronics",
                "desc": "Mobile devices, computer parts, home appliances, and accessories.",
                "image": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800",
            },
            {
                "name": "Clothing & Fashion",
                "desc": "Quality apparel and fashion accessories for men, women, and kids.",
                "image": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800",
            },
        ]

        parent_map = {}
        for cat_data in parent_cats_data:
            existing_cat_res = await db.execute(
                select(Category).where(Category.name == cat_data["name"], Category.parent_id == None, Category.is_deleted == False)  # noqa: E712
            )
            existing_cat = existing_cat_res.scalar_one_or_none()
            if not existing_cat:
                cat = Category(
                    name=cat_data["name"],
                    slug=generate_unique_slug(cat_data["name"]),
                    description=cat_data["desc"],
                    image_url=cat_data["image"],
                    depth=0
                )
                db.add(cat)
                await db.flush()
                parent_map[cat_data["name"]] = cat.id
                print(f"[SEED] Parent Category created: {cat_data['name']}")
            else:
                parent_map[cat_data["name"]] = existing_cat.id

        # Subcategories
        sub_cats_data = [
            # Grocery subcategories
            {
                "name": "Dairy Product",
                "parent": "Grocery",
                "desc": "Milk, butter, paneer, ghee, and other dairy essentials.",
                "image": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800",
            },
            {
                "name": "Oil & Ghee",
                "parent": "Grocery",
                "desc": "Premium cooking oils and pure Desi Ghee.",
                "image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800",
            },
            {
                "name": "Dry Fruits",
                "parent": "Grocery",
                "desc": "Premium quality dry fruits, raisins, almonds, and walnuts.",
                "image": "https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=800",
            },
            {
                "name": "Whole Spices & other Grocery",
                "parent": "Grocery",
                "desc": "Aromatic whole spices, powders, flour, grains, and seasoning.",
                "image": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800",
            },
            {
                "name": "Seeds",
                "parent": "Grocery",
                "desc": "Healthy chia seeds, pumpkin seeds, and sunflower seeds.",
                "image": "https://images.unsplash.com/photo-1508888636900-51a44e59000a?w=800",
            },
            {
                "name": "Herb & Ayurvedic",
                "parent": "Grocery",
                "desc": "Natural herbs, ayurvedic extracts, and traditional remedies.",
                "image": "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800",
            },
            {
                "name": "Worship Item",
                "parent": "Grocery",
                "desc": "Pooja essentials, havan samagri, gangajal, and camphor.",
                "image": "https://images.unsplash.com/photo-1609137144813-90d540b68631?w=800",
            },
            # Electronics subcategories
            {
                "name": "Mobile & Accessories",
                "parent": "Electronics",
                "desc": "Smartphones, chargers, power banks, and headphones.",
                "image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
            },
            {
                "name": "Computer Accessories",
                "parent": "Electronics",
                "desc": "Laptops, keyboards, wireless mice, storage drives, and printers.",
                "image": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
            },
            {
                "name": "Home Electronics",
                "parent": "Electronics",
                "desc": "TVs, ACs, refrigerators, coolers, and home appliances.",
                "image": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800",
            },
            # Clothing subcategories
            {
                "name": "Men",
                "parent": "Clothing & Fashion",
                "desc": "Men's shirts, trousers, jeans, ethnic wear, and shoes.",
                "image": "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800",
            },
            {
                "name": "Women",
                "parent": "Clothing & Fashion",
                "desc": "Women's sarees, kurtis, tops, dresses, and fashion footwear.",
                "image": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800",
            },
            {
                "name": "Kids",
                "parent": "Clothing & Fashion",
                "desc": "Apparel and school uniform combos for boys and girls.",
                "image": "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=800",
            },
            {
                "name": "Fashion Essential",
                "parent": "Clothing & Fashion",
                "desc": "Watches, belts, sunglasses, bags, and undergarments.",
                "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
            },
        ]

        sub_map = {}
        for sub_data in sub_cats_data:
            parent_id = parent_map[sub_data["parent"]]
            existing_sub_res = await db.execute(
                select(Category).where(Category.name == sub_data["name"], Category.parent_id == parent_id, Category.is_deleted == False)  # noqa: E712
            )
            existing_sub = existing_sub_res.scalar_one_or_none()
            if not existing_sub:
                sub_cat = Category(
                    name=sub_data["name"],
                    slug=generate_unique_slug(sub_data["name"]),
                    description=sub_data["desc"],
                    image_url=sub_data["image"],
                    parent_id=parent_id,
                    depth=1
                )
                db.add(sub_cat)
                await db.flush()
                sub_map[sub_data["name"]] = sub_cat.id
                print(f"[SEED] Sub Category created: {sub_data['name']} under {sub_data['parent']}")
            else:
                sub_map[sub_data["name"]] = existing_sub.id

        # ── 3. Products Data Definition ──────────────────────
        products_to_seed = [
            # Dairy Product (under Grocery)
            {"name": "Amul Fresh Milk", "sub_cat": "Dairy Product", "sku": "GR-DY-MILK", "price": 3000, "unit": "1L", "gst": 5},
            {"name": "Amul Salted Butter", "sub_cat": "Dairy Product", "sku": "GR-DY-BUTR", "price": 5600, "unit": "500g", "gst": 12},
            {"name": "Amul Paneer", "sub_cat": "Dairy Product", "sku": "GR-DY-PANR", "price": 9000, "unit": "200g", "gst": 5},
            {"name": "Gowardhan Desi Ghee", "sub_cat": "Dairy Product", "sku": "GR-DY-GHEE", "price": 68000, "unit": "1L", "gst": 12},
            {"name": "Fresh Cream", "sub_cat": "Dairy Product", "sku": "GR-DY-CREAM", "price": 13000, "unit": "1kg", "gst": 12},
            {"name": "Butter (Makkhan)", "sub_cat": "Dairy Product", "sku": "GR-DY-MKKN", "price": 13000, "unit": "1kg", "gst": 12},
            {"name": "Fresh Curd (Dahi)", "sub_cat": "Dairy Product", "sku": "GR-DY-CURD", "price": 33200, "unit": "1kg", "gst": 5},
            {"name": "Sweet Corn", "sub_cat": "Dairy Product", "sku": "GR-DY-CORN", "price": 14000, "unit": "1kg", "gst": 5},
            {"name": "Soya Chaap", "sub_cat": "Dairy Product", "sku": "GR-DY-CHAP", "price": 12000, "unit": "1kg", "gst": 5},
            {"name": "Paneer (Fresh)", "sub_cat": "Dairy Product", "sku": "GR-DY-PANR-F", "price": 22700, "unit": "1kg", "gst": 5},
            {"name": "Green Peas (Matar)", "sub_cat": "Dairy Product", "sku": "GR-DY-PEAS", "price": 26000, "unit": "1 Bag", "gst": 5},

            # Oil & Ghee (under Grocery)
            {"name": "Refined Oil 500ml (Box)", "sub_cat": "Oil & Ghee", "sku": "GR-OL-REF-500", "price": 176600, "unit": "Box", "gst": 5},
            {"name": "Refined Oil 1L (Box)", "sub_cat": "Oil & Ghee", "sku": "GR-OL-REF-1L", "price": 173600, "unit": "Box", "gst": 5},
            {"name": "Refined Oil 2L (Box)", "sub_cat": "Oil & Ghee", "sku": "GR-OL-REF-2L", "price": 178400, "unit": "Box", "gst": 5},
            {"name": "Refined Oil 5L (Box)", "sub_cat": "Oil & Ghee", "sku": "GR-OL-REF-5L", "price": 300600, "unit": "Box", "gst": 5},
            {"name": "Refined Oil 15L Tin", "sub_cat": "Oil & Ghee", "sku": "GR-OL-REF-15T", "price": 223100, "unit": "15L Tin", "gst": 5},
            {"name": "Refined Oil 15L Jar", "sub_cat": "Oil & Ghee", "sku": "GR-OL-REF-15J", "price": 224600, "unit": "15L Jar", "gst": 5},
            {"name": "Kachi Ghani Mustard Oil 500ml (Box)", "sub_cat": "Oil & Ghee", "sku": "GR-OL-KG-500", "price": 190000, "unit": "Box", "gst": 5},
            {"name": "Kachi Ghani Mustard Oil 1L (Box)", "sub_cat": "Oil & Ghee", "sku": "GR-OL-KG-1L", "price": 106400, "unit": "Box", "gst": 5},
            {"name": "Kachi Ghani Mustard Oil 2L (Box)", "sub_cat": "Oil & Ghee", "sku": "GR-OL-KG-2L", "price": 106400, "unit": "Box", "gst": 5},
            {"name": "Kachi Ghani Mustard Oil 5L (Box)", "sub_cat": "Oil & Ghee", "sku": "GR-OL-KG-5L", "price": 155400, "unit": "Box", "gst": 5},
            {"name": "Kachi Ghani Mustard Oil 15L Tin", "sub_cat": "Oil & Ghee", "sku": "GR-OL-KG-15T", "price": 240300, "unit": "15L Tin", "gst": 5},
            {"name": "Desi Ghee 250ml", "sub_cat": "Oil & Ghee", "sku": "GR-OL-DG-250", "price": 18000, "unit": "250ml", "gst": 12},
            {"name": "Desi Ghee 500ml", "sub_cat": "Oil & Ghee", "sku": "GR-OL-DG-500", "price": 35000, "unit": "500ml", "gst": 12},
            {"name": "Desi Ghee 1L", "sub_cat": "Oil & Ghee", "sku": "GR-OL-DG-1L", "price": 68000, "unit": "1L", "gst": 12},
            {"name": "Ghee Dalda", "sub_cat": "Oil & Ghee", "sku": "GR-OL-DALDA", "price": 15000, "unit": "1L", "gst": 12},

            # Dry Fruits (under Grocery)
            {"name": "Dry Apricot (Khubani)", "sub_cat": "Dry Fruits", "sku": "GR-DF-APRT", "price": 29000, "unit": "1kg", "gst": 12},
            {"name": "Dry Dates Yellow (Chhuhara Pila)", "sub_cat": "Dry Fruits", "sku": "GR-DF-DDATE-Y", "price": 14000, "unit": "1kg", "gst": 12},
            {"name": "Dry Dates Black (Chhuhara Kala)", "sub_cat": "Dry Fruits", "sku": "GR-DF-DDATE-B", "price": 14000, "unit": "1kg", "gst": 12},
            {"name": "Dates (Khajur)", "sub_cat": "Dry Fruits", "sku": "GR-DF-DATE", "price": 35000, "unit": "1kg", "gst": 12},
            {"name": "Raisins (Kishmish)", "sub_cat": "Dry Fruits", "sku": "GR-DF-RSN", "price": 41500, "unit": "1kg", "gst": 12},
            {"name": "Black Raisins (Munakka)", "sub_cat": "Dry Fruits", "sku": "GR-DF-BRSN", "price": 46000, "unit": "1kg", "gst": 12},
            {"name": "Almonds Fresh (Badam Fresh)", "sub_cat": "Dry Fruits", "sku": "GR-DF-ALMD-F", "price": 90500, "unit": "1kg", "gst": 12},
            {"name": "Almond Indi (Badam Indi)", "sub_cat": "Dry Fruits", "sku": "GR-DF-ALMD-I", "price": 86000, "unit": "1kg", "gst": 12},
            {"name": "Grated Dry Coconut (Gari Lachha)", "sub_cat": "Dry Fruits", "sku": "GR-DF-COCO-L", "price": 23000, "unit": "1kg", "gst": 12},
            {"name": "Coconut Powder (Gari Burada)", "sub_cat": "Dry Fruits", "sku": "GR-DF-COCO-B", "price": 26500, "unit": "1kg", "gst": 12},
            {"name": "Fox Nuts (Makhana) 250g", "sub_cat": "Dry Fruits", "sku": "GR-DF-FOX-250", "price": 79500, "unit": "1kg", "gst": 5},
            {"name": "Fox Nuts (Makhana) 100g", "sub_cat": "Dry Fruits", "sku": "GR-DF-FOX-100", "price": 92000, "unit": "1kg", "gst": 5},
            {"name": "Cashew Nut 3pcs", "sub_cat": "Dry Fruits", "sku": "GR-DF-CSHW-3", "price": 82200, "unit": "1kg", "gst": 12},
            {"name": "Cashew 320 Lot", "sub_cat": "Dry Fruits", "sku": "GR-DF-CSHW-320", "price": 84800, "unit": "1kg", "gst": 12},
            {"name": "Cashew 180 Lot", "sub_cat": "Dry Fruits", "sku": "GR-DF-CSHW-180", "price": 97000, "unit": "1kg", "gst": 12},
            {"name": "Minced Cashew (Kaju Noka)", "sub_cat": "Dry Fruits", "sku": "GR-DF-CSHW-MIN", "price": 62000, "unit": "1kg", "gst": 12},
            {"name": "Trail Mix (Sukhe Meve)", "sub_cat": "Dry Fruits", "sku": "GR-DF-TRAIL", "price": 66000, "unit": "1kg", "gst": 12},
            {"name": "Whole Walnut (Akhrot Sabut)", "sub_cat": "Dry Fruits", "sku": "GR-DF-WLNT-W", "price": 77000, "unit": "1kg", "gst": 12},
            {"name": "Walnut Kernels (Akhrot Giri)", "sub_cat": "Dry Fruits", "sku": "GR-DF-WLNT-K", "price": 60000, "unit": "1kg", "gst": 12},
            {"name": "Pistachio (Pista)", "sub_cat": "Dry Fruits", "sku": "GR-DF-PST", "price": 117300, "unit": "1kg", "gst": 12},
            {"name": "Green Pistachio (Hara Pista)", "sub_cat": "Dry Fruits", "sku": "GR-DF-GPST", "price": 318500, "unit": "1kg", "gst": 12},

            # Whole Spices & other Grocery (under Grocery)
            {"name": "Carom Seeds (Ajwain)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-CAROM", "price": 15500, "unit": "1kg", "gst": 5},
            {"name": "Black Cardamom (Badi Elaichi)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-BCARD", "price": 174000, "unit": "1kg", "gst": 5},
            {"name": "Star Anise (Chakraphool)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-STARA", "price": 41300, "unit": "1kg", "gst": 5},
            {"name": "Coriander Seeds (Dhania Khadi)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-CORI", "price": 19000, "unit": "1kg", "gst": 5},
            {"name": "Turmeric Fingers (Haldi Khadi)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-TURM", "price": 20600, "unit": "1kg", "gst": 5},
            {"name": "Mace (Javitri)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-MACE", "price": 203000, "unit": "1kg", "gst": 5},
            {"name": "Nutmeg (Jaiphal)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-NUTM", "price": 86000, "unit": "1kg", "gst": 5},
            {"name": "Cumin Seeds (Jeera Keshari)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-JEERA-C", "price": 27600, "unit": "1kg", "gst": 5},
            {"name": "Cumin Seeds (Jeera Kohinoor)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-JEERA-K", "price": 25900, "unit": "1kg", "gst": 5},
            {"name": "Cubeb Pepper (Kabab Chini)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-KCUBEB", "price": 110000, "unit": "1kg", "gst": 5},
            {"name": "Black Pepper (Kali Mirch)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-BPEP", "price": 82200, "unit": "1kg", "gst": 5},
            {"name": "Nigella Seeds (Kalonji)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-NIG", "price": 23400, "unit": "1kg", "gst": 5},
            {"name": "Dried Fenugreek (Kasuri Methi)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-KMETHI", "price": 2900, "unit": "1 Pack", "gst": 5},
            {"name": "Red Chilli (Lal Mirch)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-RCHIL", "price": 24400, "unit": "1kg", "gst": 5},
            {"name": "Cloves (Laung)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-CLOV", "price": 91100, "unit": "1kg", "gst": 5},
            {"name": "Fenugreek Seeds (Methi Dana)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-METHID", "price": 9100, "unit": "1kg", "gst": 5},
            {"name": "White Pepper (Safed Mirch)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-WMIRCH", "price": 117500, "unit": "1kg", "gst": 5},
            {"name": "Shatavari", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-SHATAV", "price": 96500, "unit": "1kg", "gst": 5},
            {"name": "Betel Nut (Supari Jam)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-SUPJAM", "price": 58300, "unit": "1kg", "gst": 5},
            {"name": "Betel Nut (Supari Jeeni)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-SUPJEE", "price": 57300, "unit": "1kg", "gst": 5},
            {"name": "Edible Gond", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-GONDED", "price": 20700, "unit": "1kg", "gst": 5},
            {"name": "Dried Gond (Gond Katli)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-GONDKT", "price": 31500, "unit": "1kg", "gst": 5},
            {"name": "Tapioca Pearls (Sabudana)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-SABU", "price": 7900, "unit": "1kg", "gst": 5},
            {"name": "White Turmeric (Haldi Aama)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-TURMAM", "price": 25000, "unit": "1kg", "gst": 5},
            {"name": "Garden Cress Seeds (Chamsur)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-CHAMSUR", "price": 10300, "unit": "1kg", "gst": 5},
            {"name": "Green Cardamom (Elaichi Chhoti)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-GCARD", "price": 320000, "unit": "1kg", "gst": 5},
            {"name": "Black Cardamom (Elaichi Badi)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-BCARDB", "price": 226500, "unit": "1kg", "gst": 5},
            {"name": "Cinnamon (Dalchini)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-CIN", "price": 28900, "unit": "1kg", "gst": 5},
            {"name": "Coriander Seeds (Dhania Sabut)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-DHSAB", "price": 19000, "unit": "1kg", "gst": 5},
            {"name": "Tata Salt", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-SALT", "price": 2500, "unit": "1kg", "gst": 0},
            {"name": "Poppy Seeds (Posta Dana)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-POSTA", "price": 134100, "unit": "1kg", "gst": 5},
            {"name": "Licorice (Mulethi)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-MUL", "price": 24500, "unit": "1kg", "gst": 5},
            {"name": "Asafoetida (Hing) 20g", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-HING-20", "price": 23400, "unit": "1 Pack", "gst": 5},
            {"name": "Asafoetida (Hing) 50g", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-HING-50", "price": 29600, "unit": "1 Pack", "gst": 5},
            {"name": "Asafoetida (Hing) 100g", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-HING-100", "price": 58200, "unit": "1 Pack", "gst": 5},
            {"name": "Asafoetida (Hing) 5g", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-HING-5", "price": 6800, "unit": "1 Pack", "gst": 5},
            {"name": "White Sesame Seeds (Safed Til)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-TILSF", "price": 15400, "unit": "1kg", "gst": 5},
            {"name": "Kashmiri Red Chilli", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-KCHILI-P", "price": 6600, "unit": "1 Pack", "gst": 5},
            {"name": "Tamarind (Imli)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-TAM", "price": 6200, "unit": "1kg", "gst": 5},
            {"name": "Sendha Namak (Rock Salt)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-RSALT", "price": 5000, "unit": "1kg", "gst": 0},
            {"name": "Vanilla Essence", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-VANIL", "price": 13700, "unit": "1 Bottle", "gst": 18},
            {"name": "Baking Powder", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-BPOW", "price": 7800, "unit": "1 Pack", "gst": 18},
            {"name": "Baking Soda", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-BSODA", "price": 4600, "unit": "1 Pack", "gst": 18},
            {"name": "Black Sesame Seeds (Kala Til)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-TILKL", "price": 25500, "unit": "1kg", "gst": 5},
            {"name": "Frankincense (Loban)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-LOBAN", "price": 16000, "unit": "1kg", "gst": 5},
            {"name": "Alum (Fitkari)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-FITKARI", "price": 4000, "unit": "1kg", "gst": 5},
            {"name": "Rock Sugar (Mishri)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-MISHRI", "price": 6600, "unit": "1kg", "gst": 5},
            {"name": "Thread Sugar (Mishri Dhaga)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-MISHRID", "price": 10000, "unit": "1kg", "gst": 5},
            {"name": "Fennel Seeds (Saunf Gold)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-SAUNFG", "price": 16000, "unit": "1kg", "gst": 5},
            {"name": "Fennel Seeds (Saunf Tulsi)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-SAUNFT", "price": 13800, "unit": "1kg", "gst": 5},
            {"name": "Bay Leaf (Tej Patta)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-BAY", "price": 9800, "unit": "1kg", "gst": 5},
            {"name": "Dry Ginger (Sonth)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-GING", "price": 36000, "unit": "1kg", "gst": 5},
            {"name": "Chirounji (Almondette)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-CHIRNJ", "price": 150000, "unit": "1kg", "gst": 5},
            {"name": "Peanuts (Mungfali)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-PEANUT", "price": 13600, "unit": "1kg", "gst": 5},
            {"name": "Arshi", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-ARSHI", "price": 13700, "unit": "1kg", "gst": 5},
            {"name": "Ashirvaad Shudh Chakki Atta", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-ATTA", "price": 45000, "unit": "10kg", "gst": 0},
            {"name": "Basmati Rice Premium", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-RICE", "price": 120000, "unit": "10kg", "gst": 0},
            {"name": "Toor Dal (Pulses)", "sub_cat": "Whole Spices & other Grocery", "sku": "GR-SP-PULSE", "price": 16000, "unit": "1kg", "gst": 0},

            # Seeds (under Grocery)
            {"name": "Pumpkin Seeds", "sub_cat": "Seeds", "sku": "GR-SD-PUMP", "price": 64800, "unit": "1kg", "gst": 5},
            {"name": "Sunflower Seeds", "sub_cat": "Seeds", "sku": "GR-SD-SUN", "price": 19000, "unit": "1kg", "gst": 5},
            {"name": "Chia Seeds", "sub_cat": "Seeds", "sku": "GR-SD-CHIA", "price": 44000, "unit": "1kg", "gst": 5},
            {"name": "Watermelon Seeds", "sub_cat": "Seeds", "sku": "GR-SD-WMELON", "price": 57500, "unit": "1kg", "gst": 5},
            {"name": "Flax Seeds (Alsi)", "sub_cat": "Seeds", "sku": "GR-SD-FLAX", "price": 13700, "unit": "1kg", "gst": 5},

            # Herb & Ayurvedic (under Grocery)
            {"name": "Sikakai Powder", "sub_cat": "Herb & Ayurvedic", "sku": "GR-HB-SIKA", "price": 14400, "unit": "1kg", "gst": 5},
            {"name": "Shatavari Powder", "sub_cat": "Herb & Ayurvedic", "sku": "GR-HB-SHAT", "price": 96500, "unit": "1kg", "gst": 5},
            {"name": "Chirayta (Kiratatikta)", "sub_cat": "Herb & Ayurvedic", "sku": "GR-HB-CHIR", "price": 19000, "unit": "1kg", "gst": 5},
            {"name": "Dried Amla", "sub_cat": "Herb & Ayurvedic", "sku": "GR-HB-AMLA", "price": 14500, "unit": "1kg", "gst": 5},
            {"name": "Bach Wood", "sub_cat": "Herb & Ayurvedic", "sku": "GR-HB-BACH", "price": 25400, "unit": "1kg", "gst": 5},
            {"name": "Licorice Root (Mulethi)", "sub_cat": "Herb & Ayurvedic", "sku": "GR-HB-LICO", "price": 24500, "unit": "1kg", "gst": 5},
            {"name": "Soapnut (Reetha)", "sub_cat": "Herb & Ayurvedic", "sku": "GR-HB-SOAP", "price": 7500, "unit": "1kg", "gst": 5},
            {"name": "Alkanet Root (Ratanjot)", "sub_cat": "Herb & Ayurvedic", "sku": "GR-HB-ALKA", "price": 64000, "unit": "1kg", "gst": 5},
            {"name": "Paneer Flower (Paneer Phool)", "sub_cat": "Herb & Ayurvedic", "sku": "GR-HB-PFLR", "price": 20000, "unit": "1kg", "gst": 5},

            # Worship Item (under Grocery)
            {"name": "Havan Samagri Pack", "sub_cat": "Worship Item", "sku": "GR-WP-HAVAN", "price": 12000, "unit": "1kg", "gst": 5},
            {"name": "Gangajal Holy Water", "sub_cat": "Worship Item", "sku": "GR-WP-GANGA", "price": 4500, "unit": "500ml", "gst": 18},
            {"name": "Camphor (Kapoor) Tablets", "sub_cat": "Worship Item", "sku": "GR-WP-KAPOOR", "price": 15000, "unit": "500g", "gst": 18},
            {"name": "Lotus Seeds Raw (Kamalgatta)", "sub_cat": "Worship Item", "sku": "GR-WP-LOTUS", "price": 45000, "unit": "1kg", "gst": 5},
            {"name": "Havan Masala", "sub_cat": "Worship Item", "sku": "GR-WP-HMASALA", "price": 18000, "unit": "1kg", "gst": 5},

            # Mobile & Accessories (under Electronics)
            {"name": "Apple iPhone 15 Pro", "sub_cat": "Mobile & Accessories", "sku": "EL-MB-IPH15", "price": 12900000, "unit": "1 unit", "gst": 18},
            {"name": "Fast Charger 20W USB-C", "sub_cat": "Mobile & Accessories", "sku": "EL-MB-CHGR", "price": 190000, "unit": "1 unit", "gst": 18},
            {"name": "Boat Bassheads Earphones", "sub_cat": "Mobile & Accessories", "sku": "EL-MB-EAR", "price": 59900, "unit": "1 unit", "gst": 18},
            {"name": "Noise ColorFit Smartwatch", "sub_cat": "Mobile & Accessories", "sku": "EL-MB-WATCH", "price": 249900, "unit": "1 unit", "gst": 18},
            {"name": "Mi Power Bank 20000mAh", "sub_cat": "Mobile & Accessories", "sku": "EL-MB-PBANK", "price": 189900, "unit": "1 unit", "gst": 18},

            # Computer Accessories (under Electronics)
            {"name": "HP Pavilion Laptop", "sub_cat": "Computer Accessories", "sku": "EL-CP-LAP", "price": 6200000, "unit": "1 unit", "gst": 18},
            {"name": "Logitech Wireless Keyboard", "sub_cat": "Computer Accessories", "sku": "EL-CP-KEYB", "price": 129900, "unit": "1 unit", "gst": 18},
            {"name": "Logitech M170 Wireless Mouse", "sub_cat": "Computer Accessories", "sku": "EL-CP-MOUSE", "price": 59900, "unit": "1 unit", "gst": 18},
            {"name": "Crucial 1TB External SSD", "sub_cat": "Computer Accessories", "sku": "EL-CP-SSD", "price": 699900, "unit": "1 unit", "gst": 18},
            {"name": "Canon G3010 Printer", "sub_cat": "Computer Accessories", "sku": "EL-CP-PRIN", "price": 1450000, "unit": "1 unit", "gst": 18},

            # Home Electronics (under Electronics)
            {"name": "Samsung 43\" Crystal 4K TV", "sub_cat": "Home Electronics", "sku": "EL-HM-TV", "price": 3290000, "unit": "1 unit", "gst": 18},
            {"name": "Daikin 1.5 Ton Split AC", "sub_cat": "Home Electronics", "sku": "EL-HM-AC", "price": 4200000, "unit": "1 unit", "gst": 18},
            {"name": "LG 240L Double Door Refrigerator", "sub_cat": "Home Electronics", "sku": "EL-HM-FRIG", "price": 2650000, "unit": "1 unit", "gst": 18},
            {"name": "Symphony Air Cooler", "sub_cat": "Home Electronics", "sku": "EL-HM-COOL", "price": 890000, "unit": "1 unit", "gst": 18},
            {"name": "Havells Pedestal Fan", "sub_cat": "Home Electronics", "sku": "EL-HM-FAN", "price": 299900, "unit": "1 unit", "gst": 18},
            {"name": "Bajaj Room Heater", "sub_cat": "Home Electronics", "sku": "EL-HM-HEAT", "price": 189900, "unit": "1 unit", "gst": 18},
            {"name": "Philips Hair Dryer", "sub_cat": "Home Electronics", "sku": "EL-HM-DRYER", "price": 129900, "unit": "1 unit", "gst": 18},
            {"name": "Philips Beard Trimmer", "sub_cat": "Home Electronics", "sku": "EL-HM-TRIM", "price": 149900, "unit": "1 unit", "gst": 18},

            # Men (under Clothing & Fashion)
            {"name": "Cotton T-Shirt (Polo)", "sub_cat": "Men", "sku": "CL-MN-TSHRT", "price": 79900, "unit": "1 unit", "gst": 5},
            {"name": "Casual Denim Jeans", "sub_cat": "Men", "sku": "CL-MN-JEAN", "price": 149900, "unit": "1 unit", "gst": 5},
            {"name": "Formal Slim-Fit Shirt", "sub_cat": "Men", "sku": "CL-MN-SHRT", "price": 119900, "unit": "1 unit", "gst": 5},
            {"name": "Cotton Trousers", "sub_cat": "Men", "sku": "CL-MN-TROUS", "price": 139900, "unit": "1 unit", "gst": 5},
            {"name": "Kurta Pyjama Set (Ethnic)", "sub_cat": "Men", "sku": "CL-MN-ETHNIC", "price": 249900, "unit": "1 unit", "gst": 5},
            {"name": "Sports Running Shoes", "sub_cat": "Men", "sku": "CL-MN-FOOT", "price": 199900, "unit": "1 unit", "gst": 5},

            # Women (under Clothing & Fashion)
            {"name": "Silk Banarasi Saree", "sub_cat": "Women", "sku": "CL-WM-SAREE", "price": 499900, "unit": "1 unit", "gst": 5},
            {"name": "Anarkali Kurti Set", "sub_cat": "Women", "sku": "CL-WM-KURTI", "price": 189900, "unit": "1 unit", "gst": 5},
            {"name": "Salwar Suit Set", "sub_cat": "Women", "sku": "CL-WM-SUIT", "price": 229900, "unit": "1 unit", "gst": 5},
            {"name": "Casual Summer Dress", "sub_cat": "Women", "sku": "CL-WM-DRESS", "price": 129900, "unit": "1 unit", "gst": 5},
            {"name": "Stylish Floral Top", "sub_cat": "Women", "sku": "CL-WM-TOP", "price": 69900, "unit": "1 unit", "gst": 5},
            {"name": "Heels Sandals (Footwear)", "sub_cat": "Women", "sku": "CL-WM-FOOT", "price": 149900, "unit": "1 unit", "gst": 5},

            # Kids (under Clothing & Fashion)
            {"name": "Boys Casual Shirt & Shorts", "sub_cat": "Kids", "sku": "CL-KD-BOYS", "price": 89900, "unit": "1 unit", "gst": 5},
            {"name": "Girls Frock Dress", "sub_cat": "Kids", "sku": "CL-KD-GIRLS", "price": 99900, "unit": "1 unit", "gst": 5},
            {"name": "School Uniform Combo", "sub_cat": "Kids", "sku": "CL-KD-SCHOOL", "price": 129900, "unit": "1 unit", "gst": 5},

            # Fashion Essential (under Clothing & Fashion)
            {"name": "Casio Analogue Watch", "sub_cat": "Fashion Essential", "sku": "CL-ES-WATCH", "price": 299900, "unit": "1 unit", "gst": 18},
            {"name": "Leather Belt", "sub_cat": "Fashion Essential", "sku": "CL-ES-BELT", "price": 49900, "unit": "1 unit", "gst": 18},
            {"name": "Travel Backpack", "sub_cat": "Fashion Essential", "sku": "CL-ES-BAG", "price": 189900, "unit": "1 unit", "gst": 18},
            {"name": "Ray-Ban Aviator Sunglasses", "sub_cat": "Fashion Essential", "sku": "CL-ES-GLASS", "price": 450000, "unit": "1 unit", "gst": 18},
            {"name": "Cotton Men's Undergarments (Pack of 3)", "sub_cat": "Fashion Essential", "sku": "CL-ES-UNDR", "price": 59900, "unit": "1 pack", "gst": 5},
        ]

        # Ingest products in bulk
        for p in products_to_seed:
            existing_prod_res = await db.execute(
                select(Product).where(Product.sku == p["sku"], Product.is_deleted == False)  # noqa: E712
            )
            existing_prod = existing_prod_res.scalar_one_or_none()
            sub_cat_id = sub_map[p["sub_cat"]]
            
            # Fetch parent category_id
            sub_cat_obj = await db.get(Category, sub_cat_id)
            parent_cat_id = sub_cat_obj.parent_id if sub_cat_obj else sub_cat_id

            # Determine product image
            product_img_url = sub_cat_obj.image_url if sub_cat_obj else "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800"

            if not existing_prod:
                product = Product(
                    name=p["name"],
                    slug=generate_unique_slug(p["name"]),
                    sku=p["sku"],
                    base_price=p["price"],
                    gst_rate=p["gst"],
                    stock_qty=100,  # 100 units in stock
                    low_stock_threshold=10,
                    unit=p["unit"],
                    category_id=parent_cat_id,
                    sub_category_id=sub_cat_id,
                    status=ProductStatus.ACTIVE,
                )
                db.add(product)
                await db.flush()

                product_img = ProductImage(
                    product_id=product.id,
                    image_url=product_img_url,
                    sort_order=0
                )
                db.add(product_img)
                print(f"[SEED] Product created: {p['name']} ({p['unit']}) - INR {p['price']/100:.2f}")
            else:
                product = existing_prod

            # Check and create role-based pricing
            stmt_v = select(VendorPricing).where(VendorPricing.product_id == product.id)
            vp = (await db.execute(stmt_v)).scalar_one_or_none()
            if not vp:
                db.add(VendorPricing(product_id=product.id, price=int(product.base_price * 0.8)))
            
            stmt_r = select(RetailerPricing).where(RetailerPricing.product_id == product.id)
            rp = (await db.execute(stmt_r)).scalar_one_or_none()
            if not rp:
                db.add(RetailerPricing(product_id=product.id, price=int(product.base_price * 0.9)))
            await db.flush()

        # ── 4. Sample Vendor ─────────────────────────────────
        existing_vendor = await db.execute(
            select(User).where(User.mobile == "+919876543210", User.is_deleted == False)  # noqa: E712
        )
        if not existing_vendor.scalar_one_or_none():
            vendor_user = User(
                mobile="+919876543210",
                full_name="Test Vendor",
                role=UserRole.VENDOR,
                status=UserStatus.ACTIVE,
                is_verified=True,
                password_hash=hash_password("vendor123"),
            )
            db.add(vendor_user)
            await db.flush()
            vendor = Vendor(
                user_id=vendor_user.id,
                business_name="Test Wholesale Co.",
                gst_number="29AADCB2230M1ZP",
                city="Mumbai",
                state="Maharashtra",
            )
            db.add(vendor)
            print("[SEED] Vendor created: Test Vendor (+919876543210)")

        # ── 5. Sample Retailer ───────────────────────────────
        existing_retailer = await db.execute(
            select(User).where(User.mobile == "+919876543211", User.is_deleted == False)  # noqa: E712
        )
        retailer_user_obj = existing_retailer.scalar_one_or_none()
        if not retailer_user_obj:
            retailer_user = User(
                mobile="+919876543211",
                full_name="Test Retailer",
                role=UserRole.RETAILER,
                status=UserStatus.ACTIVE,
                is_verified=True,
                password_hash=hash_password("retailer123"),
            )
            db.add(retailer_user)
            await db.flush()
            retailer = Retailer(
                user_id=retailer_user.id,
                business_name="Test Retail Shop",
                owner_name="Test Retailer",
                business_type="General Store",
                city="Delhi",
                state="Delhi",
                credit_limit=10000000,  # INR 1,00,000 in paise
            )
            db.add(retailer)
            print("[SEED] Retailer created: Test Retailer (+919876543211)")

            # Seed ledger entries
            ledger_debit = LedgerEntry(
                user_id=retailer_user.id,
                entry_type=LedgerType.DEBIT,
                amount=250000,
                reference_type="order",
                reference_id=uuid.uuid4(),
                description="Order #ORD-10023",
            )
            ledger_credit = LedgerEntry(
                user_id=retailer_user.id,
                entry_type=LedgerType.CREDIT,
                amount=100000,
                reference_type="payment",
                reference_id=uuid.uuid4(),
                description="Manual Cash payment",
            )
            db.add(ledger_debit)
            db.add(ledger_credit)
        else:
            # Check if ledger entries already exist
            existing_ledger = await db.execute(select(LedgerEntry).where(LedgerEntry.user_id == retailer_user_obj.id))
            if not existing_ledger.scalars().first():
                ledger_debit = LedgerEntry(
                    user_id=retailer_user_obj.id,
                    entry_type=LedgerType.DEBIT,
                    amount=250000,
                    reference_type="order",
                    reference_id=uuid.uuid4(),
                    description="Order #ORD-10023",
                )
                ledger_credit = LedgerEntry(
                    user_id=retailer_user_obj.id,
                    entry_type=LedgerType.CREDIT,
                    amount=100000,
                    reference_type="payment",
                    reference_id=uuid.uuid4(),
                    description="Manual Cash payment",
                )
                db.add(ledger_debit)
                db.add(ledger_credit)
                print("[SEED] Ledger entries created for Retailer")

        # ── 6. Seed Sample Orders ────────────────────────────
        r_user_res = await db.execute(
            select(User).where(User.mobile == "+919876543211")
        )
        r_user = r_user_res.scalar_one_or_none()
        if r_user:
            existing_ord = await db.execute(
                select(Order).where(Order.user_id == r_user.id)
            )
            if not existing_ord.scalars().first():
                # Get some product IDs
                p_res = await db.execute(select(Product).limit(2))
                prods = p_res.scalars().all()
                if prods:
                    # Let's create an order
                    order = Order(
                        user_id=r_user.id,
                        order_number="ORD-20260612-SEED1111",
                        status=OrderStatus.CONFIRMED,
                        subtotal=sum(p.base_price for p in prods),
                        gst_amount=sum(int(p.base_price * p.gst_rate / 100) for p in prods),
                        discount_amount=0,
                        grand_total=sum(p.base_price + int(p.base_price * p.gst_rate / 100) for p in prods),
                        delivery_address="Test Retail Shop, Delhi, Delhi - 110001",
                    )
                    db.add(order)
                    await db.flush()

                    for p in prods:
                        oi = OrderItem(
                            order_id=order.id,
                            product_id=p.id,
                            product_name=p.name,
                            quantity=1,
                            unit_price=p.base_price,
                            gst_rate=p.gst_rate,
                            line_total=p.base_price,
                            gst_amount=int(p.base_price * p.gst_rate / 100),
                        )
                        db.add(oi)

                    # Create a ledger debit entry matching this order
                    ledger_debit = LedgerEntry(
                        user_id=r_user.id,
                        entry_type=LedgerType.DEBIT,
                        amount=order.grand_total,
                        reference_type="order",
                        reference_id=order.id,
                        description=f"Order {order.order_number}",
                    )
                    db.add(ledger_debit)
                    print(f"[SEED] Sample order created for Retailer: {order.order_number}")

        await db.commit()
        print("\n[SEED] [SUCCESS] Seed data insertion complete!")


if __name__ == "__main__":
    asyncio.run(seed())
