export default {
  input: 'src/main/js/GlpkConfigurator.js',
  external: ['glpk.js', 'splconfigurator'],
  output: [{
    file: 'target/rollup-plugin-spl.cjs.js',
    format: 'cjs',
  },
  {
    file: 'target/rollup-plugin-spl.es.js',
    format: 'es',
  },
  ],
};
