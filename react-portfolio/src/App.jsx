import { useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import About from './components/About'
import './App.css'

function App() {

  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
      </main>
    </>
  )
}

export default App
