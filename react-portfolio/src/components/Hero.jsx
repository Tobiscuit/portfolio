import profileImage from '../assets/juan_ramirez.jpg';

const Hero = () => {
  return (
    <div className="section hero divider">
      <div className="image">
        <img src={profileImage} alt="juan-ramirez-standing.png" />
      </div>
      <div>
        <h1>Juan Ramirez</h1>
        <p>Full Stack Developer</p>
        <Link href="projects" className="btn">Projects</Link>
      </div>
    </div>
  )
}

export default Hero