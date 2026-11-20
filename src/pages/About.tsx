import type { Go } from '../types'
import { site } from '../data/site'
import { featuredSrc } from '../data/featured'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { SocialLinks } from '../components/SocialLinks'

export function About({ go }: { go: Go }) {
  return (
    <div className="dark-page">
      <Header go={go}/>

      <section className="about-hero section-pad">
        <div>
          <span className="eyebrow">{site.photographer} · Amateur photographer</span>
          <h1>Learning to see,<br/>one photo<br/>at a <em>time.</em></h1>
        </div>
        <img src={site.portraitSrc} alt={site.portraitAlt}/>
      </section>

      <section className="about-story section-pad">
        <span className="big-number">01</span>
        <div>
          <span className="eyebrow">Just getting started</span>
          <p className="lead">I’m not a professional — just someone who enjoys carrying a camera and seeing what happens.</p>
          <p>I started taking photos as a hobby: flowers, mountains, gardens and quiet corners close to home. Every time I go out I learn something new about light, patience and looking a little closer.</p>
          <p>This site is my notebook — a place to keep the pictures I like and to see how I improve over time.</p>
        </div>
      </section>

      <section className="about-banner">
        <img src={featuredSrc('009', 1600)} alt=""/>
        <div>
          <span className="eyebrow">What I like to photograph</span>
          <p>Flowers · Mountains · Gardens · Quiet places · Everyday light</p>
        </div>
      </section>

      <section className="contact-block section-pad">
        <span className="eyebrow">Say hello</span>
        <h2>Like what you see?<br/><em>Let’s talk photos.</em></h2>
        <a href={site.social[0].url} target="_blank" rel="noopener noreferrer">
          Write me on Instagram <Icon name="arrow"/>
        </a>
        <SocialLinks size={22}/>
      </section>
      <Footer go={go}/>
    </div>
  )
}
