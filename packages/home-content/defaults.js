import { createSection, createItem, createSelection as selection } from './model.js';

const terms = (text) =>
  text
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean);
const section = (kind, id, title, includes = '', overrides = {}) => ({
  ...createSection(kind, id, title),
  selection: { ...selection(), includeTerms: terms(includes) },
  ...overrides,
});
const item = (id, title, includes, backgroundColor = '#EEF4E5') => ({
  ...createItem(id, title),
  backgroundColor,
  selection: { ...selection(), includeTerms: terms(includes) },
});
const produceExclusions = terms(
  'powder,paste,sauce,ketchup,pickle,chips,juice,biscuit,cookie,bread,cake,oil,dried,dehydrated,seed',
);
const vegetables =
  'onion,tomato,potato,brinjal,eggplant,carrot,beans,peas,cauliflower,cabbage,capsicum,okra,bhindi,gourd,beetroot';
const fruits =
  'banana,apple,orange,mango,grapes,papaya,pineapple,watermelon,pomegranate,guava,pear,lemon,lime';
const greens = 'spinach,palak,lettuce,amaranth,methi,fenugreek leaves,leafy greens,soppu';
const herbs = 'coriander,cilantro,mint,pudina,curry leaves,basil,parsley,dill,rosemary,thyme';
const regional =
  'snack,chips,murukku,chakli,chakkuli,kodubale,namkeen,mixture,sev,chivda,sweet,mithai,laddu,laddoo,barfi,burfi,halwa,mysore pak,peda,chikki,pickle,achar,masala,spice,jaggery,coconut oil,rice,atta,dal,juice,kokum,kashaya';
const imageBase = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/';
const footer = () =>
  section('footer', 'brand-footer', 'Gloceries', '', {
    subtitle: 'Made with ♥ in Udupi (Tulunadu), India',
  });
const freshSection = (id, title, includes, overrides = {}) => {
  const s = section('products', id, title, includes, overrides);
  s.selection.excludeTerms = produceExclusions;
  return s;
};
export const DEFAULT_CONTENT = {
  grocery: {
    schemaVersion: 1,
    tabTitle: 'Grocery',
    enabled: true,
    sections: [
      section('categories', 'shop-by-category', '', '', {
        layout: 'grid',
        columns: 4,
        limit: 12,
        items: [
          item('fruits', 'Fresh fruits', fruits),
          item('vegetables', 'Fresh vegetables', vegetables),
          item('exotics', 'Cuts & exotics', 'broccoli,zucchini,avocado,kiwi,mushroom'),
          item('herbs', 'Herbs & spice mix', herbs + ',masala,spice'),
          item('dairy', 'Dairy & plant-based', 'milk,curd,yogurt,paneer,cheese,butter'),
          item('meat', 'Meat, eggs & fish', 'meat,eggs,fish,chicken'),
          item('organic', 'Healthy & organic', 'organic,oats,millet'),
          item('bread', 'Breads & batters', 'bread,batter'),
        ],
      }),
      section(
        'products',
        'best-sellers',
        'Your everyday essentials',
        'rice,atta,dal,oil,milk,bread,eggs,salt,sugar,masala',
      ),
      section('banner', 'grocery-poster', 'Stock up on essentials', '', {
        backgroundColor: '#EAF3DF',
        buttonEnabled: true,
      }),
      section('products', 'grocery-offers', 'Savings on your staples', '', {
        selection: { ...selection(), discountedOnly: true },
      }),
      section('stores', 'shops-you-know', 'From shops you know', '', {
        limit: 4,
        buttonEnabled: true,
        buttonLabel: 'View store',
      }),
      section(
        'products',
        'kitchen-essentials',
        'Kitchen Essentials',
        'rice,atta,flour,dal,pulses,lentils,oil,salt,sugar,masala',
        { layout: 'grid', limit: 3, buttonEnabled: true },
      ),
      section(
        'products',
        'breakfast-essentials',
        'Breakfast Essentials',
        'milk,bread,eggs,oats,poha,batter,spread',
        { layout: 'grid', limit: 3, buttonEnabled: true },
      ),
      section(
        'products',
        'snacks-and-drinks',
        'Snacks & Drinks',
        'biscuit,namkeen,chips,juice,drink,beverage',
        { layout: 'grid', limit: 6, buttonEnabled: true },
      ),
      section('brands', 'local-brands', 'Brands from around here', '', {
        layout: 'grid',
        limit: 3,
      }),
      section(
        'products',
        'pickles-sauces-spreads',
        'Pickles, Sauces & Spreads',
        'pickle,sauce,spread,chutney,ketchup',
      ),
      footer(),
    ],
  },
  fresh: {
    schemaVersion: 1,
    tabTitle: 'Fruit & Veg',
    enabled: true,
    sections: [
      freshSection(
        'everyday-fresh',
        'Everyday Fresh',
        'onion,tomato,potato,banana,lemon,coriander',
      ),
      section('categories', 'shop-fresh', 'Shop Fresh', '', {
        layout: 'grid',
        limit: 6,
        items: [
          item('vegetables', 'Vegetables', vegetables),
          item('fruits', 'Fruits', fruits, '#FFF2DD'),
          item('leafy-greens', 'Leafy Greens', greens),
          item('herbs', 'Herbs', herbs, '#E9F3EE'),
          item(
            'exotic-produce',
            'Exotic Produce',
            'broccoli,zucchini,avocado,asparagus,cherry tomatoes,dragon fruit,kiwi,blueberry,strawberry,mushroom',
            '#F0EBF7',
          ),
          item('fresh-cuts', 'Fresh Cuts', 'cut,chopped,peeled,sliced,diced', '#F8EAE0'),
        ].map((i) => ({ ...i, selection: { ...i.selection, excludeTerms: produceExclusions } })),
      }),
      freshSection('everyday-vegetables', 'Everyday vegetables', vegetables, {
        layout: 'grid',
        limit: 6,
        buttonEnabled: true,
      }),
      freshSection('fruit-favourites', 'Fruit favourites', fruits, {
        layout: 'grid',
        limit: 6,
        buttonEnabled: true,
      }),
      section('hero', 'home-grown-nearby', 'Your Neighbourhood\nHarvest', '', {
        backgroundColor: '#E2E9CE',
        imageUrl: imageBase + 'fresh1.png',
        imageAspectRatio: 1,
        imageFade: true,
        limit: 4,
        buttonEnabled: true,
        buttonLabel: 'Explore local produce',
        selection: { ...selection(), mode: 'manual' },
      }),
      section(
        'stores',
        'fresh-nearby-shops',
        'Fresh From Nearby Shops',
        vegetables + ',' + fruits + ',' + herbs + ',' + greens,
        { limit: 4, buttonEnabled: true, buttonLabel: 'View store' },
      ),
      freshSection('seasonal-picks', 'Seasonal picks', '', {
        selection: { ...selection(), mode: 'manual' },
      }),
      freshSection('greens-and-herbs', 'Greens & herbs', greens + ',' + herbs),
      footer(),
    ],
  },
  regional: {
    schemaVersion: 1,
    tabTitle: 'Regional',
    enabled: true,
    sections: [
      section('categories', 'shop-by-category', 'Shop by category', '', {
        layout: 'grid',
        limit: 6,
        items: [
          item(
            'snacks',
            'Local Snacks',
            'chips,murukku,chakli,chakkuli,kodubale,namkeen,mixture,sev,chivda,snack',
            '#FFF0DD',
          ),
          item(
            'sweets',
            'Sweets',
            'sweet,mithai,laddu,laddoo,barfi,burfi,halwa,mysore pak,peda,chikki',
            '#FBE8ED',
          ),
          item(
            'pantry-staples',
            'Pantry Staples',
            'rice,atta,flour,dal,pulses,lentils,grain,coconut oil,jaggery,salt,sugar,poha,rava',
            '#F5EDD9',
          ),
          item(
            'spice-mixes',
            'Spice Mixes',
            'masala,spice mix,sambar powder,rasam powder,chutney powder,chutney pudi,curry powder',
            '#F9E7D9',
          ),
          item(
            'drinks',
            'Drinks',
            'juice,drink,coconut water,buttermilk,lassi,kokum,kashaya,sherbet',
            '#E7F1EE',
          ),
          item('pickles', 'Pickles', 'pickle,achar,achaar,uppinakayi,thokku', '#EBEEDB'),
        ],
      }),
      section('products', 'district-favourites', 'Your district’s favourites', regional),
      section('banner', 'regional-brand-banner', '', '', {
        imageUrl: imageBase + 'regional-brand.png',
        imageAspectRatio: 1.5,
        imageFade: true,
      }),
      section('brands', 'brands-around-here', 'Brands from around here', '', {
        layout: 'grid',
        limit: 3,
      }),
      section('stores', 'nearby-shops', 'From nearby shops', regional, {
        limit: 4,
        buttonEnabled: true,
        buttonLabel: 'View store',
      }),
      section('products', 'something-new', 'Something new to try', '', {
        selection: { ...selection(), mode: 'manual' },
      }),
      section('products', 'local-offers', 'Deals from around here', regional, {
        layout: 'grid',
        limit: 6,
        selection: { ...selection(), includeTerms: terms(regional), discountedOnly: true },
      }),
      section('hero', 'coconut-oil', 'Rooted in Our\nCoast', 'coconut oil', {
        backgroundColor: '#F3EBD9',
        imageUrl: imageBase + 'update-regional.png',
        imageAspectRatio: 3,
        imageFade: true,
        limit: 4,
        buttonEnabled: true,
        buttonLabel: 'Explore coconut oils',
      }),
      section('products', 'all-district-products', 'All district products', regional, {
        layout: 'grid',
        limit: 9,
      }),
      footer(),
    ],
  },
};
DEFAULT_CONTENT.regional.sections.find((s) => s.id === 'coconut-oil').selection.excludeTerms =
  terms('hair,skin,body,massage,cosmetic,shampoo,conditioner');
