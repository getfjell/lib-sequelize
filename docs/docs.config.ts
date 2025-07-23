interface DocsConfig {
  projectName: string;
  basePath: string;
  port: number;
  branding: {
    theme: string;
    tagline: string;
    logo?: string;
    backgroundImage?: string;
    primaryColor?: string;
    accentColor?: string;
    github?: string;
    npm?: string;
  };
  sections: Array<{
    id: string;
    title: string;
    subtitle: string;
    file: string;
  }>;
  filesToCopy: Array<{
    source: string;
    destination: string;
  }>;
  plugins?: any[];
  version: {
    source: string;
  };
  customContent?: {
    [key: string]: (content: string) => string;
  };
}

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
