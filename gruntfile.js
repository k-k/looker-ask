var grunt = require('grunt');

grunt.loadTasks('./tasks');
grunt.loadNpmTasks('grunt-aws-lambda');

grunt.initConfig({
  lambda_invoke: {
    default: {
    }
  },
  lambda_deploy: {
    default: {
      function: 'LAMBDA FUNCTION NAME',
      arn: 'ARN OF LAMBDA FUNCTION HERE',
      options: {
        timeout : 5,
        memory: 256
      }
    }
  },
  lambda_package: {
    default: {
    }
  }
});

grunt.registerTask('deploy', ['lambda_package', 'lambda_deploy']);
