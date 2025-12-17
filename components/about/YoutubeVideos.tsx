import YoutubeCarousel from './YoutubeCarousel';

const VIDEOS = [
  {
    code: "K2QuAwVl1oI",
    title: "Interview about my trading journey and strategies"
  },
  {
    code: "zC-7tx3ar0w",
    title: "Discussion about quantitative trading and machine learning"
  },
  {
    code: "CeWglVNpevk",
    title: "My testimony after 1 year of trading"
  }
];

export default function YoutubeVideos() {
  return <YoutubeCarousel videos={VIDEOS} />;
}


