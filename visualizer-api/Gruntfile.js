module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    eslint: {
      target: ["*.js"]
    }
  });
  grunt.loadNpmTasks("grunt-eslint");

  grunt.registerTask("default", ["eslint"]);
};