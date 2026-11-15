import { render } from '@testing-library/react-native';
import { HomeLoader } from '../src/screens/home/loading/HomeLoader';
import { ScreenSkeleton } from '../src/components/loading/ScreenSkeleton';

it('uses screen-shaped placeholders without visible loading copy', async () => {
  const view = await render(<HomeLoader />);
  expect(view.queryAllByText(/Loading|Wonderful|Tap Away|Treasures/)).toHaveLength(0);
  expect(view.getByTestId('skeleton-products')).toBeTruthy();
  expect(view.getByTestId('skeleton-categories')).toBeTruthy();
});
it('exposes loading status accessibly and removes it immediately when content arrives', async () => {
  const view = await render(<ScreenSkeleton layout="list" label="Loading orders" />);
  expect(view.getByRole('progressbar').props.accessibilityState).toEqual({ busy: true });
  await view.rerender(<></>);
  expect(view.queryByRole('progressbar')).toBeNull();
});
