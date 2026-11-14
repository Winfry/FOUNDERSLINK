import { WorkspaceTabs } from '../../../src/components/layout/WorkspaceTabs';

// The founder's workspace. On a phone, five tabs in words: Home, Investors,
// Get ready, Guide (the AI co-pilot) and Chamas. Network, her profile and
// notices are reached from Home, the top bar and the side menu.
export default function FounderTabsLayout() {
  return (
    <WorkspaceTabs
      role="founder"
      screens={[
        { name: 'home', title: 'Home' },
        { name: 'matches', title: 'Investors' },
        { name: 'readiness', title: 'Get ready' },
        { name: 'copilot', title: 'Guide' },
        { name: 'chamas', title: 'Chamas' },
        { name: 'connections', title: 'Network', hidden: true },
        { name: 'profile', title: 'Profile', hidden: true },
        { name: 'notifications', title: 'Notifications', hidden: true },
      ]}
    />
  );
}
