import { BriefcaseBusiness, ClipboardCheck, Handshake, House, Menu } from 'lucide-react-native';
import { WorkspaceTabs } from '../../../src/components/layout/WorkspaceTabs';

// The founder's workspace. On a phone, five tabs, each a word with its icon:
// Home, Investors, Readiness, Deals and More. "More" holds everything else
// on the side menu (Messages, Network, Chamas, the Co-pilot, Notifications,
// Settings, her profile), so a phone reaches all of it too.
export default function FounderTabsLayout() {
  return (
    <WorkspaceTabs
      role="founder"
      screens={[
        { name: 'home', title: 'Home', icon: House },
        { name: 'matches', title: 'Investors', icon: Handshake },
        { name: 'readiness', title: 'Readiness', icon: ClipboardCheck },
        { name: 'deal-rooms', title: 'Deals', icon: BriefcaseBusiness },
        { name: 'more', title: 'More', icon: Menu },
        { name: 'copilot', title: 'Co-pilot', hidden: true },
        { name: 'chamas', title: 'Chamas', hidden: true },
        { name: 'connections', title: 'Network', hidden: true },
        { name: 'profile', title: 'Profile', hidden: true },
        { name: 'notifications', title: 'Notifications', hidden: true },
      ]}
    />
  );
}
