import { Masthead } from '@/components/Masthead';
import { Range } from '@/components/Range';
import { Ring } from '@/components/Ring';
import { Notes } from '@/components/Notes';
import { BeforeAfter } from '@/components/BeforeAfter';
import { Bento, Quote, Maison, Journal, Footer } from '@/components/Sections';
import { Reveals } from '@/components/Reveals';
import { ScreenFx } from '@/components/ScreenFx';

export default function Home() {
  return (
    <>
      <Masthead />
      <Bento />
      <Range />
      <Ring />
      <Notes />
      <Quote />
      <BeforeAfter />
      <Maison />
      <Journal />
      <Footer />
      <Reveals />
      <ScreenFx />
    </>
  );
}
