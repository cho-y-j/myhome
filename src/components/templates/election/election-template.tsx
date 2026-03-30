import type { SiteData } from "@/types/site";
import ElectionHero from "./election-hero";
import ElectionKeywords from "./election-keywords";
import ElectionProfile from "./election-profile";
import ElectionPledges from "./election-pledges";
import ElectionGallery from "./election-gallery";
import ElectionSchedule from "./election-schedule";
import ElectionNews from "./election-news";
import ElectionVideos from "./election-videos";
import ElectionContacts from "./election-contacts";
import ElectionFooter from "./election-footer";
import ElectionNav from "./election-nav";
import TrackingScript from "@/components/templates/tracking-script";

interface Props {
  data: SiteData;
}

export default function ElectionTemplate({ data }: Props) {
  const { user, settings } = data;

  return (
    <div
      className="min-h-screen bg-white text-gray-900"
      style={
        {
          "--primary": settings.primaryColor,
          "--accent": settings.accentColor,
        } as React.CSSProperties
      }
    >
      <ElectionHero settings={settings} candidateName={user.name} />

      <ElectionKeywords pledges={data.pledges} />

      <ElectionProfile
        introText={settings.introText}
        profiles={data.profiles}
        candidateName={user.name}
        partyName={settings.partyName}
        profileImageUrl={settings.profileImageUrl}
      />

      <ElectionPledges pledges={data.pledges} />

      <ElectionGallery gallery={data.gallery} />

      <ElectionSchedule schedules={data.schedules} />

      <ElectionNews news={data.news} />

      <ElectionVideos videos={data.videos} />

      <ElectionContacts
        contacts={data.contacts}
        kakaoAppKey={settings.kakaoAppKey}
      />

      <ElectionFooter settings={settings} candidateName={user.name} />

      <ElectionNav />

      <TrackingScript code={user.code} />
    </div>
  );
}
