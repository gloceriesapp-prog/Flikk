import { fireEvent, render } from '@testing-library/react-native';
import { ContentTiles } from '../src/screens/home/content/ContentTiles';
import { createSection, createItem } from '../src/screens/home/content/contracts';
jest.mock('../src/components/AppImage', () => ({ AppImage: (props: object) => {
 const { View } = jest.requireActual('react-native'); return <View {...props} testID="quick-category-artwork" />;
} }));
test('Udupi uses the same arched artwork and category labels as Fruit & Veg', async () => {
 const section = { ...createSection('categories','regional-custom'), layout:'grid' as const, columns:3 as const,
   items:[{...createItem('snacks','Local Snacks'),imageUrl:'https://images.gloceries.com/snacks.png'}] };
 const onOpen = jest.fn();
 const view = await render(<ContentTiles section={section} products={[]} onOpen={onOpen} freshCategories />);
 expect(view.getByTestId('quick-category-artwork').parent!.props.style).toMatchObject({aspectRatio:4/4.6,borderTopLeftRadius:999,borderTopRightRadius:999,borderBottomLeftRadius:0,borderBottomRightRadius:0});
 expect(view.getByTestId('quick-category-artwork').props.resizeMode).toBe('contain');
 await fireEvent.press(view.getByRole('button',{name:'Shop Local Snacks'})); expect(onOpen).toHaveBeenCalledWith(section.items[0]);
 await view.rerender(<ContentTiles section={{...section,items:[{...section.items[0],enabled:false}]}} products={[]} onOpen={onOpen} freshCategories />);
 expect(view.queryByRole('button',{name:'Shop Local Snacks'})).toBeNull();
});
