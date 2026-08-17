// Real content for the "Vegetables" tap-through — divided into its own
// sub-categories on the left (All/Leafy/Exotic/Salad/Chowmin), per the
// reference screenshot this screen replicates.

import type { CategoryDetailData } from '../types';

const RED_POTATO = { id: 'red-potato', name: 'Red Potato - (Aloo) - 1kg', localName: 'Batate', weight: '1 kg', price: 20, originalPrice: 35, rating: 4.3, ratingCount: '19k', imageSeed: 'veg-potato' };
const ONION = { id: 'onion', name: 'Onion / Pyaz (Mix Size)', localName: 'Erulli', weight: '1 Kg', price: 40, originalPrice: 70, rating: 4.4, ratingCount: '21k', imageSeed: 'veg-onion' };
const TOMATO = { id: 'tomato', name: 'Tomato- Tamatar (450g - 550g)', localName: 'Tomato Hannu', weight: '(450g - 550g)', price: 20, originalPrice: 45, rating: 4.4, ratingCount: '18k', imageSeed: 'veg-tomato' };
const SPONGE_GOURD = { id: 'sponge-gourd', name: 'nenua Sponge Gourd/Tori', localName: 'Heere Kai', weight: '450-500g', price: 13, originalPrice: 34, rating: 4.1, ratingCount: '2.4k', imageSeed: 'veg-sponge-gourd' };
const BHINDI = { id: 'bhindi', name: 'Bhindi-Lady Finger( Pack Of Two )', localName: 'Bende Kai', weight: '500g+500g=1kg', price: 15, originalPrice: 52, rating: 4.2, ratingCount: '3.1k', imageSeed: 'veg-bhindi' };
const POINTED_GOURD = { id: 'pointed-gourd', name: 'Pointed Gourd/Parwal', localName: 'Parwal', weight: '450-500g', price: 18, originalPrice: 35, rating: 4.0, ratingCount: '1.2k', imageSeed: 'veg-pointed-gourd' };

const SPINACH = { id: 'spinach', name: 'Fresh Spinach', localName: 'Palak Soppu', weight: '250 g', price: 22, originalPrice: 26, rating: 4.3, ratingCount: '9.2k', imageSeed: 'veg-palak' };
const CORIANDER = { id: 'coriander', name: 'Coriander Leaves', localName: 'Kothambari Soppu', weight: '100 g', price: 12, originalPrice: 15, rating: 4.5, ratingCount: '14k', imageSeed: 'veg-coriander' };
const CURRY_LEAVES = { id: 'curry-leaves', name: 'Curry Leaves', localName: 'Karibevu', weight: '50 g', price: 10, originalPrice: 14, rating: 4.6, ratingCount: '6.1k', imageSeed: 'veg-curry-leaves' };
const CABBAGE = { id: 'cabbage', name: 'Cabbage', localName: 'Cabbage Kai', weight: '1 pc', price: 25, originalPrice: 34, rating: 4.2, ratingCount: '4.5k', imageSeed: 'veg-cabbage' };

const BROCCOLI = { id: 'broccoli', name: 'Broccoli', localName: 'Exotic', weight: '250 g', price: 55, originalPrice: 65, rating: 4.2, ratingCount: '1.6k', imageSeed: 'veg-broccoli' };
const CAPSICUM = { id: 'capsicum', name: 'Capsicum', localName: 'Donne Menasu', weight: '500 g', price: 40, originalPrice: 52, rating: 4.3, ratingCount: '5.5k', imageSeed: 'veg-capsicum' };
const ZUCCHINI = { id: 'zucchini', name: 'Zucchini', localName: 'Exotic', weight: '500 g', price: 48, originalPrice: 60, rating: 4.1, ratingCount: '780', imageSeed: 'veg-zucchini' };

const CARROT = { id: 'carrot', name: 'Carrot', localName: 'Carrot Kai', weight: '500 g', price: 28, originalPrice: 36, rating: 4.3, ratingCount: '7.4k', imageSeed: 'veg-carrot' };
const BEETROOT = { id: 'beetroot', name: 'Beetroot', localName: 'Beetroot Kai', weight: '500 g', price: 30, originalPrice: 38, rating: 4.1, ratingCount: '2.9k', imageSeed: 'veg-beetroot' };
const CUCUMBER = { id: 'cucumber', name: 'Cucumber', localName: 'Southekai', weight: '500 g', price: 22, originalPrice: 28, rating: 4.4, ratingCount: '3.3k', imageSeed: 'veg-cucumber' };

const SPRING_ONION = { id: 'spring-onion', name: 'Spring Onion', localName: 'Erulli Soppu', weight: '200 g', price: 18, originalPrice: 24, rating: 4.2, ratingCount: '1.9k', imageSeed: 'veg-spring-onion' };

export const VEGETABLE_DETAIL_DATA: CategoryDetailData = {
  title: 'Vegetables',
  subCategories: [
    { id: 'all', label: 'All' },
    { id: 'leafy', label: 'Leafy' },
    { id: 'exotic', label: 'Exotic' },
    { id: 'salad', label: 'Salad' },
    { id: 'chowmin', label: 'Chowmin' },
  ],
  productsBySubCategory: {
    all: [RED_POTATO, ONION, TOMATO, SPONGE_GOURD, BHINDI, POINTED_GOURD],
    leafy: [SPINACH, CORIANDER, CURRY_LEAVES, CABBAGE],
    exotic: [BROCCOLI, CAPSICUM, ZUCCHINI],
    salad: [CARROT, BEETROOT, CUCUMBER],
    chowmin: [CAPSICUM, CABBAGE, SPRING_ONION, CARROT],
  },
};
