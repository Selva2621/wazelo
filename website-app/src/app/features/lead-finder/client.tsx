"use client";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

const data: FeatureDetailData = {
  slug: "lead-finder",
  tag: "Lead finder",
  heroTitle: "Find leads<br /><span style=\"color:#ffb77d\">by type and city.</span>",
  heroSubtitle: "Search Google Maps and IndiaMART for the businesses you sell to. Review the list, then add them as leads.",
  heroScreen: "/media/features/lead-finder.jpg",
  overviewTitle: "Search, review, import.",
  overviewDesc: "Pick a business type and a place. You check the results before anything is added.",
  capabilities: [
    { icon: "map", title: "Google Maps", desc: "Search businesses by type and city, across several areas." },
    { icon: "storefront", title: "IndiaMART", desc: "Find suppliers and sellers listed on IndiaMART." },
    { icon: "tune", title: "Filters", desc: "Filter by rating, reviews, phone, website and more." },
    { icon: "alternate_email", title: "Emails from websites", desc: "Optionally look up email addresses on each business's website." },
    { icon: "chat", title: "WhatsApp check", desc: "Check which numbers are on WhatsApp before you message." },
    { icon: "person_off", title: "No duplicates", desc: "Skip businesses that are already your contacts." },
  ],
  howItWorks: [
    { step: "01", title: "Choose a source", desc: "Google Maps or IndiaMART." },
    { step: "02", title: "Search", desc: "Enter a business type and a location." },
    { step: "03", title: "Review", desc: "Look through the results and pick the ones you want." },
    { step: "04", title: "Import", desc: "Add them as contacts and start your follow-up." },
  ],
  relatedFeatures: [
    { label: "Contacts", href: "/features/contacts", icon: "group" },
    { label: "Sequences", href: "/features/sequences", icon: "low_priority" },
    { label: "Campaigns", href: "/features/campaigns", icon: "campaign" },
    { label: "Lead ads", href: "/features/lead-ads", icon: "ads_click" },
  ],
};

export default function LeadFinderClient() {
  return <FeatureDetailPage data={data} />;
}
