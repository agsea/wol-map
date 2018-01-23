/**
 * Created by aegean on 2017/11/16.
 */

var gulp = require('gulp');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var cssmin = require('gulp-cssmin');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var rename = require("gulp-rename");
var inject = require('gulp-inject-string');
var formatDate = require('format-date');

// jshint验证规则
var jshintCfg = require('./jshint-config.json');
// 获取package内容
var pkgJSON = require('./package.json');
// 项目信息配置
var targetDir = 'dist';
var moduleName = 'WolMap';
var timeYMDHMS = formatDate('{year}/{month}/{day} {hours}:{minutes}:{seconds}', new Date());   //日期格式1
var timeYMDHM = formatDate('{year}/{month}/{day} {hours}:{minutes}', new Date());   //日期格式2
var descLine = `/*! ${pkgJSON.description} */`;
var bannerPartLine = `/*! ${moduleName} v${pkgJSON.version} | (c) ${pkgJSON.author} | Created on ${pkgJSON.createdTime} */`;
var concatBanner = `${bannerPartLine}\n${descLine}\n/*! Modified on ${timeYMDHMS} */\n\n`;
var uglifyBanner = `${bannerPartLine}\n${descLine}\n/*! Modified on ${timeYMDHM} */\n\n`;
var footerStr = `\n\n/*** That blue eyes exist in the aegean sea! ***/\n`;


// 压缩css
gulp.task('minCss', function() {
    gulp.src(['./src/lib/ol-v4.1.1/ol.css', './src/css/*.css'])
        .pipe(concat('all.min.css'))
        .pipe(cssmin())
        .pipe(inject.prepend(uglifyBanner))
        .pipe(inject.append(footerStr))
        .pipe(rename(`${pkgJSON.name}-${pkgJSON.version}.min.css`))
        .pipe(gulp.dest(`${targetDir}/`));
});

// 合并js：包含合并的临时目标js、代码检查
gulp.task('concatJs_tmp', function() {
    // 生成合并后不压缩的临时代码
    return gulp.src('src/*.js')
        .pipe(jshint(jshintCfg)).pipe(jshint.reporter('jshint-stylish'))
        .pipe(concat(`all-temp.js`))
        .pipe(rename(`${pkgJSON.name}-${pkgJSON.version}-temp.js`))
        .pipe(gulp.dest(`${targetDir}/temp/`));
});
// 合并js并压缩：包含合并的临时目标js、代码检查
gulp.task('concatJs_tmp_min', function() {
    // 生成合并后压缩的临时代码
    return gulp.src('src/*.js')
        .pipe(jshint(jshintCfg)).pipe(jshint.reporter('jshint-stylish'))
        .pipe(concat(`all-temp.min.js`))
        .pipe(uglify())
        .pipe(rename(`${pkgJSON.name}-${pkgJSON.version}-temp.min.js`))
        .pipe(gulp.dest(`${targetDir}/temp/`));
});
// 合并未压缩的临时js与依赖库
gulp.task('concatJs', ['concatJs_tmp'], function() {
    return gulp.src(['./src/lib/ol-v4.1.1/ol.js', `./${targetDir}/temp/${pkgJSON.name}-${pkgJSON.version}-temp.js`])
        .pipe(concat('all.js'))
        .pipe(inject.prepend(concatBanner))
        .pipe(inject.append(footerStr))
        .pipe(rename(`${pkgJSON.name}-${pkgJSON.version}.js`))
        .pipe(gulp.dest(`${targetDir}/`));
});
// 合并压缩的临时js与依赖库
gulp.task('concatJs_min', ['concatJs_tmp_min'], function() {
    return gulp.src(['./src/lib/ol-v4.1.1/ol.js', `./${targetDir}/temp/${pkgJSON.name}-${pkgJSON.version}-temp.min.js`])
        .pipe(concat('all.min.js'))
        .pipe(inject.prepend(uglifyBanner))
        .pipe(inject.append(footerStr))
        .pipe(rename(`${pkgJSON.name}-${pkgJSON.version}.min.js`))
        .pipe(gulp.dest(`${targetDir}/`));
});

// 移除临时文件
gulp.task('cleanTemp', ['concatJs', 'concatJs_min'], function() {
    // 返回 stream 本身表示它已经被完成
    return gulp.src(`${targetDir}/temp/**`, {read: false}).pipe(clean());
});

// 拷贝资源等静态文件以及无需经过上述任务流处理的文件
gulp.task('copyStatic', function() {
    return gulp.src(['src/image/**'])
        .pipe(gulp.dest(`${targetDir}/image`));
});


// 汇总任务
gulp.task('build', ['minCss', 'concatJs_tmp', 'concatJs_tmp_min', 'concatJs', 'concatJs_min', 'copyStatic', 'cleanTemp']);
// 执行任务
gulp.task('default', ['build']);