//Grunt构建工具配置
module.exports = function(grunt) {
    //获取package内容
    var pkg = grunt.file.readJSON('package.json');

    //项目信息配置
    var projInfo = {
        name: 'WolMao',   //一般写导出对象的名字
        modifyTimeF1: '<%= grunt.template.today("yyyy/mm/dd HH:MM:ss") %>',   //格式化当前日期
        modifyTimeF2: '<%= grunt.template.today("yyyy/mm/dd") %>',   //格式化当前日期
        descr: '/*! ' + pkg.description + ' /*\n',
        bannerPart: '/*! <%= name %> v' + pkg.version + ' | (c) ' + pkg.author + ' | Created on ' + pkg.createdTime + ' */\n',
        concatBanner: '<%= bannerPart %>' + '<%= descr %>' + '/*! Modified on <%= modifyTimeF1 %> */\n\n',
        uglifyBanner: '<%= bannerPart %>' + '<%= descr %>' + '/*! Modified on <%= modifyTimeF2 %> */\n',
        concatFooter: '',
        uglifyFooter: '\n\n//*** That blue eyes exist in the aegean sea! ***//',
    };

    //初始化配置对象
    grunt.initConfig({
        pkg: pkg,

        //插件配置：concat、jshint、uglify、cssmin、watch
        concat: {
            options: {
                stripBanners: true, //去除注释信息
                sourceMap: false,    //生成用于调试用的sourceMap文件
                separator: '', //文件合并分隔符
                banner: grunt.template.process('<%= concatBanner %>', {data: projInfo}),  //说明信息
                footer: grunt.template.process('<%= concatFooter %>', {data: projInfo})  //页脚信息
            },
            dist: {
                src: ['src/js/*.js'],
                dest: 'build/js/<%= pkg.name %>-<%= pkg.version %>.js'
            },
        },
        jshint: {
            beforeconcat: ['src/js/*.js'],
            afterconcat: ['build/js/<%= pkg.name %>-<%= pkg.version %>.js'],
            options: {
                curly: true,
                eqeqeq: true,
                eqnull: true,
                browser: true,
                globals: {
                    jQuery: true
                }
            }
        },
        uglify: {
            options: {
                stripBanners: true,
                sourceMap: false,    //生成用于调试用的sourceMap文件
                banner: grunt.template.process('<%= uglifyBanner %>', {data: projInfo}),
                footer: grunt.template.process('<%= uglifyFooter %>', {data: projInfo})  //页脚信息
            },
            releaseTask: {
                files: {
                    'build/js/<%= pkg.name %>-<%= pkg.version %>.min.js': ['build/js/<%= pkg.name %>-<%= pkg.version %>.js']
                }
            }
        },
        cssmin: {
            releaseTask: {
                files: [{
                    expand: true,	//下面文件名的占位符（即*号）是否扩展成具体的文件名
                    cwd: 'src/css',	//待处理文件所要作用的目录
                    src: ['*.css', '!*.min.css'],	//待处理文件的文件名，字符串表示单个文件，字符串数组表示多个文件
                    dest: 'build/css',	//处理后的文件所在目录
                    ext: '-<%= pkg.version %>.min.css'	//处理后的文件的后缀名
                }]
            }
        },
        watch: {
            releaseTask: {
                options: {
                    spawn: false
                },
                files: ['src/js/*.js', 'src/css/*.css'],    //待监视文件
                tasks: ['concat', 'jshint', 'uglify', 'cssmin']   //该任务执行时所要执行的任务
            }
        }
    });

    //加载任务
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-watch');

    //注册任务：将在grunt命令执行时自动执行
    grunt.registerTask('default', ['concat', 'uglify', 'cssmin']);
}