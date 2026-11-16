import { useLocalSearchParams } from 'expo-router';
import { ExpertFinder } from '../../src/components/experts/ExpertFinder';

// Find an expert, for any member: ask in your own words, get verified
// experts with why each fits. A link can hand over the question ("ask"),
// e.g. "See who you may need at every step" in a deal room.
export default function FindAnExpert() {
  const { ask } = useLocalSearchParams<{ ask?: string }>();
  return <ExpertFinder title="Find an expert" subtitle="Ask in your own words who can help." initialQuestion={typeof ask === 'string' ? ask : undefined} />;
}
