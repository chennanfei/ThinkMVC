TM.configure({
  baseUrl: '',
  debugEnabled: true,
  
  dependencies: {
    simpleExam: ['jquery']
  },
  
  modules: {
    jquery: 'http://code.jquery.com/jquery-2.0.3.min.js',
    simpleExam: 'simple_exam.js'
  },
  
  pages: {
    home: {
      controller: 'com.HomeController',
      module: 'simpleExam'
    }
  }
});