import { ClipboardCheck, HandCoins, Handshake, LayoutDashboard, UsersRound } from 'lucide-react-native';
import { WorkspaceTabs } from '../../../src/components/layout/WorkspaceTabs';

// The founder's workspace: find investors, get ready, build a network and
// save in chamas. Profile is opened from the avatar (and the side menu on a
// computer), so the tabs stay at five on a phone.
export default function FounderTabsLayout() {
  return (
    <WorkspaceTabs
      role="founder"
      screens={[
        { name: 'home', title: 'Overview', icon: LayoutDashboard },
        { name: 'matches', title: 'Matches', icon: Handshake },
        { name: 'readiness', title: 'Readiness', icon: ClipboardCheck },
        { name: 'connections', title: 'Network', icon: UsersRound },
        { name: 'chamas', title: 'Chamas', icon: HandCoins },
        { name: 'profile', title: 'Profile', hidden: true },
        { name: 'notifications', title: 'Notifications', hidden: true },
      ]}
    />
  );
}
