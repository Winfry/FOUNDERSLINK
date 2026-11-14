import { WorkspaceTabs } from '../../../src/components/layout/WorkspaceTabs';

// The investor's workspace: businesses matched to what she funds, her
// requests and her deals. No Chamas: chamas are for founders (D14).
// Profile is opened from her photo in the top bar (and the side menu).
export default function InvestorTabsLayout() {
  return (
    <WorkspaceTabs
      role="investor"
      screens={[
        { name: 'overview', title: 'Home' },
        { name: 'discover', title: 'Businesses' },
        { name: 'requests', title: 'Requests' },
        { name: 'investments', title: 'My investments' },
        { name: 'profile', title: 'Profile', hidden: true },
        { name: 'notifications', title: 'Notifications', hidden: true },
      ]}
    />
  );
}
