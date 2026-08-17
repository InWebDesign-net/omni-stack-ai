export {
  type AffinityGraph,
  type TopicAffinity,
  TOPIC_SCORE_MAX,
  defaultAffinityGraph,
  applyDecayAndPrune,
  normalizeAffinityGraph,
  isCanonicalAffinityGraph,
  topicWeight,
  creatorWeight,
} from './affinity';
