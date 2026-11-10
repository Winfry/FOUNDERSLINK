// Stand-in for lucide-react-native in the vitest tests: its icons draw with
// react-native-svg, which Node cannot load. Every icon is a component that
// draws nothing, which is all a test of menus and data needs.
const icon = () => null;
export default new Proxy({}, { get: () => icon });
export const LayoutDashboard = icon;
export const Handshake = icon;
export const ClipboardCheck = icon;
export const UsersRound = icon;
export const HandCoins = icon;
export const MessagesSquare = icon;
export const CircleUserRound = icon;
export const Settings = icon;
export const Compass = icon;
export const Send = icon;
export const CalendarCheck = icon;
