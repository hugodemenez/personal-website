const withNextra = require('nextra')('nextra-theme-blog', './theme.config.js')
module.exports = withNextra()
module.exports = withNextra({
  images: {
    domains: ['substackcdn.com', 'substack-post-media.s3.amazonaws.com'],
  },
})
