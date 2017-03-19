var gulp=require('gulp');
var jshint=require('gulp-jshint');

var path={
    js: './src/**/*.js',
    test: './test/**/*js'
}

gulp.task('jshint',function(){
    return gulp.src([path.js,path.test])
        .pipe(jshint())
        .pipe(jshint.reporter("jshint-stylish"));
});