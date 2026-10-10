// App-side binding between this app's only connectivity source (NetInfo) and
// the two consumers that need it: react-query's onlineManager (so queries pause
// offline and refetch on reconnect) and the headless onlineStore (so the
// offline banner can render). Both are fed from the SAME NetInfo subscription —
// shared owns the adapter shapes (createNetInfoSubscriber/wireOnlineManager),
// this file just injects the real native module and tees the signal into
// onlineStore. See packages/shared/src/query/* for why the shared layer never
// imports NetInfo itself.
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { createNetInfoSubscriber, wireOnlineManager, onlineStore } from './online';

export function initOnlineWiring(): () => void {
  const netInfoSubscribe = createNetInfoSubscriber(NetInfo);
  return wireOnlineManager(onlineManager, (setOnline) =>
    netInfoSubscribe((online) => {
      setOnline(online); // react-query
      onlineStore.setOnline(online); // offline banner
    }),
  );
}
