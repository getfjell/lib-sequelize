import { DocsConfig } from '@fjell/docs-template';

const config: DocsConfig = {
  projectName: 'Fjell Lib Sequelize',
  basePath: '/lib-sequelize/',
  port: 3004,
  branding: {
    theme: 'sequelize',
    tagline: 'Sequelize Integration Library for Fjell',
    backgroundImage: '/pano.png',
    github: 'https://github.com/getfjell/lib-sequelize',
    npm: 'https://www.npmjs.com/package/@fjell/lib-sequelize'
  },
  sections: [
    {
      id: 'overview',
      title: 'Overview',
      subtitle: 'Sequelize integration & architecture',
      file: '/README.md'
    }
  ],
  filesToCopy: [
    {
      source: '../README.md',
      destination: 'public/README.md'
    }
  ],
  plugins: [],
  version: {
    source: 'package.json'
  }
}

export default config
