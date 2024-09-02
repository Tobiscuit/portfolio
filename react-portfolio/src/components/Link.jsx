import React from 'react'

const Link = ({ href, children }) => {
  return (
    <a href={href} className="btn">{children}</a>
  )
}

export default Link