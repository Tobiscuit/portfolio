import React from 'react';

const About = () => {
  return (
    <section id="about" className="about divider">
      <h2>About Me</h2>
      <p>
        I am a passionate full-stack web developer who transforms ideas into
        immersive digital experiences. With a blend of creativity and technical
        expertise, I bridge the gap between design and functionality, weaving
        code into seamless user journeys. My mission is to turn your vision into
        a reality by building web solutions that not only look stunning but also
        perform flawlessly. Let's embark on a digital adventure together, where
        innovation knows no bounds.
      </p>
      <p>
        As a full-stack web developer, I&apos;ve been on an exciting journey,
        and it all began with Zero to Mastery&apos;s DevOps Engineer program. Through
        their comprehensive curriculum and supportive community, I&apos;ve had
        the immersive learning experience has empowered me to craft a portfolio
        filled with impressive projects that showcase my skills and creativity.
        Thanks to Zero to Mastery, I&apos;ve not only gained the knowledge and
        expertise, but also the confidence to tackle any web development
        challenge that comes my way.
      </p>
      <Link className="btn" href="#">
        Download my Resume
      </Link>
    </section>
  );
};

export default About;
