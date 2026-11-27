import { fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { HomeHeaderNotice, HomeRevealSurface, useHomeReveal } from '../src/screens/home/components/HomeReveal';
jest.mock('../src/api/appConfig', () => ({ useCopy: () => '' }));
function Trigger() {
  const reveal = useHomeReveal();
  return <Pressable onPress={reveal}><Text>Show</Text></Pressable>;
}
it('shows no cart or empty-cart summary when delivery conditions are inactive', async () => {
  const view = await render(<HomeRevealSurface><HomeHeaderNotice /><Trigger /></HomeRevealSurface>);
  await fireEvent.press(view.getByText('Show'));
  expect(view.queryByText(/cart|Ready when you are|favourites/i)).toBeNull();
  await view.unmount();
});
