import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme/tokens';

/**
 * FoundersLink's people: flat, friendly figures in the brand's purple and
 * gold, drawn in code so they are sharp at any size and need no image
 * files. One style everywhere: rounded bodies, no faces, Kenyan skin tones.
 */

const SKIN = { deep: '#5C3A21', brown: '#8D5524', warm: '#A86B3C', light: '#C68642' } as const;
const HAIR = '#1F1A2E';
const INK = '#21183B';
const P = colors.primary;
const DEEP = colors.primaryDark;
const GOLD = colors.accent;
const LAV = colors.primaryLight;
const LAV2 = '#DCD2F5';
const WHITE = '#FFFFFF';
const GREEN = '#5FB58A';

type Hair = 'short' | 'afro' | 'bun' | 'wrap' | 'long' | 'bald';

interface PersonProps {
  x: number;
  /** Where the feet stand. */
  y: number;
  s?: number;
  skin: string;
  hair: Hair;
  top: string;
  bottom: string;
  /** Hand positions relative to the shoulders, in the person's own units. */
  left?: [number, number];
  right?: [number, number];
  /** Sitting: shorter legs, bent forward. */
  sitting?: boolean;
  wrapColor?: string;
  children?: ReactNode;
}

function Person({ x, y, s = 1, skin, hair, top, bottom, left = [-6, 34], right = [6, 34], sitting, wrapColor = GOLD, children }: PersonProps) {
  // Seated people keep the same hip height: the chair takes the legs' place.
  const legH = 44;
  const torsoTop = -(legH + 46);
  const shoulderY = torsoTop + 8;
  const headY = torsoTop - 16;
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      {/* legs and shoes */}
      {sitting ? (
        <G>
          {/* chair: back, seat and leg */}
          <Rect x={-30} y={-84} width={7} height={56} rx={3.5} fill={LAV2} />
          <Rect x={-28} y={-34} width={34} height={7} rx={3.5} fill={LAV2} />
          <Rect x={-16} y={-28} width={5} height={28} rx={2.5} fill={LAV2} />
          {/* thigh forward, shin down */}
          <Rect x={-12} y={-46} width={36} height={12} rx={6} fill={bottom} />
          <Rect x={13} y={-46} width={11} height={46} rx={5.5} fill={bottom} />
          <Ellipse cx={21} cy={-1} rx={9} ry={4} fill={INK} />
        </G>
      ) : (
        <G>
          <Rect x={-12} y={-legH} width={10} height={legH} rx={5} fill={bottom} />
          <Rect x={2} y={-legH} width={10} height={legH} rx={5} fill={bottom} />
          <Ellipse cx={-8} cy={-1} rx={8} ry={4} fill={INK} />
          <Ellipse cx={8} cy={-1} rx={8} ry={4} fill={INK} />
        </G>
      )}
      {/* hair behind the head */}
      {hair === 'afro' ? <Circle cx={0} cy={headY - 3} r={18} fill={HAIR} /> : null}
      {hair === 'long' ? <Rect x={-15} y={headY - 12} width={30} height={34} rx={14} fill={HAIR} /> : null}
      {/* arms, drawn under the body at the shoulder */}
      <Line x1={-15} y1={shoulderY} x2={-15 + left[0]} y2={shoulderY + left[1]} stroke={top} strokeWidth={9} strokeLinecap="round" />
      <Line x1={15} y1={shoulderY} x2={15 + right[0]} y2={shoulderY + right[1]} stroke={top} strokeWidth={9} strokeLinecap="round" />
      <Circle cx={-15 + left[0]} cy={shoulderY + left[1]} r={5} fill={skin} />
      <Circle cx={15 + right[0]} cy={shoulderY + right[1]} r={5} fill={skin} />
      {/* body */}
      <Rect x={-19} y={torsoTop} width={38} height={sitting ? 46 : 50} rx={15} fill={top} />
      <Rect x={-5} y={torsoTop - 7} width={10} height={9} rx={3} fill={skin} />
      {/* head */}
      <Circle cx={0} cy={headY} r={13} fill={skin} />
      {hair === 'short' ? <Path d={`M -13.5 ${headY} A 13.5 13.5 0 0 1 13.5 ${headY} Q 0 ${headY - 8} -13.5 ${headY} Z`} fill={HAIR} /> : null}
      {hair === 'bun' ? (
        <G>
          <Path d={`M -13.5 ${headY + 1} A 13.5 13.5 0 0 1 13.5 ${headY + 1} Q 0 ${headY - 7} -13.5 ${headY + 1} Z`} fill={HAIR} />
          <Circle cx={0} cy={headY - 16} r={7} fill={HAIR} />
        </G>
      ) : null}
      {hair === 'wrap' ? (
        <G>
          <Path d={`M -14 ${headY + 1} A 14 14 0 0 1 14 ${headY + 1} L 14 ${headY - 2} Q 0 ${headY - 26} -14 ${headY - 2} Z`} fill={wrapColor} />
          <Circle cx={9} cy={headY - 14} r={5} fill={wrapColor} />
        </G>
      ) : null}
      {hair === 'afro' || hair === 'long' ? <Path d={`M -13 ${headY - 2} Q 0 ${headY - 12} 13 ${headY - 2} A 13 13 0 0 0 -13 ${headY - 2} Z`} fill={HAIR} /> : null}
      {children}
    </G>
  );
}

const Ground = ({ y = 160, w = 200, x = 120 }: { y?: number; w?: number; x?: number }) => <Ellipse cx={x} cy={y} rx={w / 2} ry={7} fill={LAV2} />;
const Blob = ({ cx = 120, cy = 92, r = 74 }: { cx?: number; cy?: number; r?: number }) => <Circle cx={cx} cy={cy} r={r} fill={LAV} />;
const Spark = ({ x, y, c = GOLD, r = 4 }: { x: number; y: number; c?: string; r?: number }) => (
  <G>
    <Line x1={x - r} y1={y} x2={x + r} y2={y} stroke={c} strokeWidth={2.4} strokeLinecap="round" />
    <Line x1={x} y1={y - r} x2={x} y2={y + r} stroke={c} strokeWidth={2.4} strokeLinecap="round" />
  </G>
);

/** Two people meeting: a founder and an investor shaking hands. */
function Meet() {
  return (
    <G>
      <Blob />
      <Ground />
      <Person x={88} y={160} skin={SKIN.brown} hair="wrap" top={P} bottom={DEEP} right={[14, 18]} left={[-6, 34]} />
      <Person x={152} y={160} skin={SKIN.deep} hair="short" top={GOLD} bottom={INK} left={[-14, 18]} right={[6, 34]} />
      <Circle cx={120} cy={80} r={7} fill={SKIN.warm} />
      <Spark x={120} y={52} />
      <Spark x={60} y={40} c={P} r={3} />
      <Spark x={184} y={44} c={P} r={3} />
    </G>
  );
}

/** Someone looking, with a big magnifying glass. */
function Search() {
  return (
    <G>
      <Blob />
      <Ground />
      <Person x={104} y={160} skin={SKIN.warm} hair="afro" top={P} bottom={INK} right={[20, -4]} left={[-6, 34]} />
      <Line x1={150} y1={86} x2={168} y2={106} stroke={DEEP} strokeWidth={7} strokeLinecap="round" />
      <Circle cx={140} cy={74} r={20} fill={WHITE} stroke={DEEP} strokeWidth={6} />
      <Circle cx={134} cy={68} r={5} fill={LAV2} />
      <Rect x={160} y={124} width={46} height={32} rx={8} fill={WHITE} stroke={LAV2} strokeWidth={2} />
      <Rect x={167} y={132} width={22} height={5} rx={2.5} fill={GOLD} />
      <Rect x={167} y={142} width={32} height={4} rx={2} fill={LAV2} />
      <Spark x={186} y={56} />
    </G>
  );
}

/** Two founders saving together into a shared jar: a chama. */
function Savings() {
  return (
    <G>
      <Blob />
      <Ground />
      <Person x={70} y={160} skin={SKIN.deep} hair="bun" top={GOLD} bottom={DEEP} right={[22, 4]} />
      <Person x={170} y={160} skin={SKIN.light} hair="short" top={P} bottom={INK} left={[-22, 4]} />
      <Rect x={98} y={92} width={44} height={66} rx={14} fill={WHITE} stroke={DEEP} strokeWidth={4} />
      <Rect x={104} y={84} width={32} height={10} rx={4} fill={DEEP} />
      <Rect x={104} y={124} width={32} height={28} rx={9} fill={LAV2} />
      <Circle cx={113} cy={132} r={6} fill={GOLD} />
      <Circle cx={127} cy={138} r={6} fill={GOLD} />
      <Circle cx={119} cy={145} r={6} fill={GOLD} />
      <Circle cx={120} cy={62} r={8} fill={GOLD} />
      <Path d="M 120 57 L 120 67" stroke={DEEP} strokeWidth={2} strokeLinecap="round" />
    </G>
  );
}

/** Someone climbing a rising chart to a flag: getting ready, growing. */
function Growth() {
  return (
    <G>
      <Blob />
      <Ground />
      <Rect x={118} y={128} width={22} height={30} rx={5} fill={LAV2} />
      <Rect x={144} y={106} width={22} height={52} rx={5} fill={P} opacity={0.55} />
      <Rect x={170} y={80} width={22} height={78} rx={5} fill={P} />
      <Line x1={181} y1={80} x2={181} y2={44} stroke={DEEP} strokeWidth={3} strokeLinecap="round" />
      <Path d="M 182 45 L 204 52 L 182 60 Z" fill={GOLD} />
      <Person x={84} y={160} skin={SKIN.brown} hair="long" top={GOLD} bottom={DEEP} right={[18, -22]} left={[-8, 30]} />
      <Spark x={60} y={50} c={P} r={3} />
      <Spark x={150} y={60} />
    </G>
  );
}

/** An expert at a desk with a laptop, helping: a speech bubble with a tick. */
function Mentor() {
  return (
    <G>
      <Blob />
      <Ground />
      {/* the desk, beside her, with the laptop on it */}
      <Rect x={132} y={116} width={90} height={8} rx={4} fill={DEEP} />
      <Rect x={140} y={124} width={6} height={34} rx={3} fill={DEEP} />
      <Rect x={208} y={124} width={6} height={34} rx={3} fill={DEEP} />
      <Path d="M 150 116 L 158 90 L 200 90 L 194 116 Z" fill={WHITE} stroke={LAV2} strokeWidth={3} />
      <Circle cx={176} cy={103} r={4} fill={GOLD} />
      <Person x={92} y={160} skin={SKIN.deep} hair="short" top={P} bottom={INK} sitting right={[36, 14]} left={[-2, 30]} />
      {/* her answer: a speech bubble with a tick */}
      <Rect x={140} y={26} width={66} height={40} rx={13} fill={WHITE} stroke={LAV2} strokeWidth={2} />
      <Path d="M 152 64 L 146 76 L 162 64 Z" fill={WHITE} />
      <Path d="M 159 46 L 168 54 L 186 37" stroke={GREEN} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Spark x={52} y={52} c={P} r={3} />
    </G>
  );
}

/** Someone waiting calmly beside a clock: being checked. */
function Waiting() {
  return (
    <G>
      <Blob />
      <Ground />
      <Person x={96} y={160} skin={SKIN.warm} hair="wrap" wrapColor={P} top={GOLD} bottom={DEEP} left={[-4, 32]} right={[4, 32]} />
      <Circle cx={160} cy={78} r={30} fill={WHITE} stroke={DEEP} strokeWidth={5} />
      <Line x1={160} y1={78} x2={160} y2={60} stroke={P} strokeWidth={4} strokeLinecap="round" />
      <Line x1={160} y1={78} x2={174} y2={86} stroke={GOLD} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={160} cy={78} r={4} fill={DEEP} />
      <Spark x={204} y={52} c={P} r={3} />
    </G>
  );
}

/** Someone celebrating, arms up, with confetti: approved, done. */
function Celebrate() {
  return (
    <G>
      <Blob />
      <Ground />
      <Person x={120} y={160} skin={SKIN.brown} hair="afro" top={P} bottom={DEEP} left={[-18, -30]} right={[18, -30]} />
      <Rect x={62} y={44} width={8} height={14} rx={2} fill={GOLD} transform="rotate(-20 66 51)" />
      <Rect x={170} y={36} width={8} height={14} rx={2} fill={P} transform="rotate(25 174 43)" />
      <Rect x={186} y={86} width={7} height={12} rx={2} fill={GOLD} transform="rotate(40 189 92)" />
      <Rect x={48} y={96} width={7} height={12} rx={2} fill={P} transform="rotate(-35 51 102)" />
      <Spark x={92} y={28} />
      <Spark x={150} y={22} c={P} r={3} />
      <Spark x={200} y={62} r={3} />
    </G>
  );
}

/** Two speech bubbles over a person: conversations. */
function Messages() {
  return (
    <G>
      <Blob />
      <Ground />
      <Person x={84} y={160} skin={SKIN.light} hair="bun" top={P} bottom={INK} right={[14, 10]} />
      <Rect x={118} y={44} width={78} height={40} rx={14} fill={WHITE} stroke={LAV2} strokeWidth={2} />
      <Path d="M 130 82 L 124 94 L 142 82 Z" fill={WHITE} />
      <Rect x={130} y={56} width={44} height={5} rx={2.5} fill={LAV2} />
      <Rect x={130} y={66} width={30} height={5} rx={2.5} fill={LAV2} />
      <Rect x={142} y={98} width={64} height={34} rx={14} fill={P} />
      <Path d="M 192 130 L 198 140 L 184 130 Z" fill={P} />
      <Circle cx={160} cy={115} r={3.5} fill={WHITE} />
      <Circle cx={174} cy={115} r={3.5} fill={WHITE} />
      <Circle cx={188} cy={115} r={3.5} fill={WHITE} />
    </G>
  );
}

/** Three people together: a community of founders, investors and experts. */
function Together() {
  return (
    <G>
      <Blob r={78} />
      <Ground w={220} />
      <Person x={66} y={160} s={0.92} skin={SKIN.warm} hair="wrap" top={GOLD} bottom={DEEP} right={[16, 16]} />
      <Person x={120} y={160} skin={SKIN.deep} hair="short" top={P} bottom={INK} left={[-14, 18]} right={[14, 18]} />
      <Person x={174} y={160} s={0.92} skin={SKIN.light} hair="long" top={DEEP} bottom={INK} left={[-16, 16]} />
      <Spark x={120} y={20} />
      <Spark x={36} y={60} c={P} r={3} />
      <Spark x={206} y={58} c={P} r={3} />
    </G>
  );
}

const SCENES = {
  meet: { draw: Meet, label: 'Two people shaking hands' },
  search: { draw: Search, label: 'A person searching with a magnifying glass' },
  savings: { draw: Savings, label: 'Two people saving together in a shared jar' },
  growth: { draw: Growth, label: 'A person climbing a rising chart to a flag' },
  mentor: { draw: Mentor, label: 'An expert helping at a laptop' },
  waiting: { draw: Waiting, label: 'A person waiting beside a clock' },
  celebrate: { draw: Celebrate, label: 'A person celebrating with confetti' },
  messages: { draw: Messages, label: 'A person with speech bubbles' },
  together: { draw: Together, label: 'Three people standing together' },
} as const;

export type IllustrationName = keyof typeof SCENES;

export function Illustration({ name, width = 220 }: { name: IllustrationName; width?: number }) {
  const scene = SCENES[name];
  const Draw = scene.draw;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={scene.label} style={{ width, aspectRatio: 240 / 172, alignSelf: 'center' }}>
      <Svg width="100%" height="100%" viewBox="0 0 240 172">
        <Draw />
      </Svg>
    </View>
  );
}
