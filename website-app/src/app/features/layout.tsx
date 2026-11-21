import { IconFont } from "@/components/icon-font";

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IconFont />
      {children}
    </>
  );
}
