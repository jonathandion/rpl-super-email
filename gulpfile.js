/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*

    #Faster email
    @Author        Jonathan Dion / Clauderic Demers
    @Type          Javascript

  =*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*/

// modules
var gulp = require('gulp'),
    inlineCss = require('gulp-inline-css'),
    sass = require('gulp-sass'),
   	livereload = require('gulp-livereload'),
   	plumber = require('gulp-plumber'),
    watch = require('gulp-watch'),
    notify = require("gulp-notify"),
    concat = require('gulp-concat'),
    inject = require('gulp-inject-string');
    sendmail = require('gulp-mailgun'),
    ejs = require("gulp-ejs"),
    imagemin = require('gulp-imagemin'),
    pngcrush = require('imagemin-pngcrush'),
    cheerio = require('gulp-cheerio'),
    zip = require('gulp-zip'),
    html2txt = require('gulp-html2txt'),
    sftp = require('gulp-sftp'),
    prettify = require('gulp-html-prettify'),
    clean = require('gulp-clean');

    // global vars
    var deployment = true,
        content = [],
        config = {
            launchDate: "20140911",
            campaignName: "TestCampaign",
            subjectLine: "Default Subject Line"
        },
        folderName = config.launchDate + '-' + config.campaignName,
        boilerplateImg = [
            '4elements.jpg',
            'barber-spa.jpg',
            'barber-tips.jpg',
            'brushes.jpg',
            'fb-icon.png',
            'find-a-store.jpg',
            'giftideas.jpg',
            'grooming.jpg',
            'ins-icon.png',
            'razors.jpg',
            'shavingproducts.jpg',
            'spacer.gif',
            'the-brotherhood-of-shaving.jpg',
            'travel.jpg',
            'tw-icon.png',
            'youtube-icon.png'
        ],
        timestamp = + new Date(),
        imagesPath = 'dist/images/*',
        remoteImagesPath = folderName + "_" + timestamp + "/",
        sftpImages = function() {
            var images = [];
            try {
                images.push(imagesPath);
                boilerplateImg.forEach(function(el,index){
                    images.push("!dist/images/" + el);
                });
            } catch(e) {
                console.log(e);
            }
            return images;
        };


var EMAIL = {
    hidden_desc : "Shop our new Power Shave Razor. Experience exquisite craftsmanship and the latest razor technology."
}

// TASKS

// initialization
gulp.task('init', function() {
    gulp.start("clean");
    gulp.src('index.html')
        .pipe(cheerio({
            run: function ($) {
                $("head").prepend('<link rel="stylesheet" href="css/style.css">');
            }
        }))
        .pipe(inlineCss({
                applyStyleTags: true,
                applyLinkTags: true,
                removeStyleTags: true,
                removeLinkTags: true
        }))
        .pipe(cheerio({
          run: function ($) {

            $('a').each(function () {
              var el = $(this),
                rilt = el.attr("target"),
                href = el.attr("href") + '-' + rilt;
              el.attr({
                "rilt": rilt,
                "href": href
              });
              el.removeAttr('target');
            });

            $('td').each(function() {
                var el = $(this);
                el.removeAttr("rowspan");
                el.removeAttr("colspan");
            });

            $('img').each(function() {
                var el = $(this);

                if (el.attr("alt") && el.attr("alt").length > 0) {
                    content.push(el.attr("alt"));
                }

                if (el.attr('src').indexOf("spacer.gif") > -1 && el.attr('width') === "1") {
                    el.remove().closest("td").remove();
                }

            });

            var table = $("table").html();
            $("body, head").remove();
            $("html").replaceWith(table);

          }

        }))
        .pipe(inject.prepend('<% include common/partials/_header %>'))
        .pipe(inject.append('<% include common/partials/_footer %>'))
        .pipe(prettify({indent_char: ' ', indent_size: 2}))
        .pipe(gulp.dest(''))
        .pipe(livereload())
        .pipe(notify("Init Compiled"));
});


gulp.task('clean', function () {
    return gulp.src(sftpImages(),{read: false})
        .pipe(clean());
});


gulp.task('sass', function () {
    watch('scss/**/*.scss', function(files) {
        files
            .pipe(plumber())
            .pipe(sass({sourcemap: false, style: 'nested'}))
            // .pipe(autoprefixer("last 2 versions", "> 1%", "ie 8"))
            .pipe(concat('style.css'))
            .pipe(gulp.dest('css'))
            .pipe(livereload())
            .pipe(notify("Stylesheets Compiled"));
    });
});

gulp.task('images', function () {
    return gulp.src('images/*')
        .pipe(imagemin({
            progressive: false,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngcrush()]
        }))
        .pipe(gulp.dest('dist/images'));
});


gulp.task('ejs', function(){
    gulp.src("index.html")
        .pipe(ejs(EMAIL))
        .pipe(gulp.dest('dist'));
});

gulp.task('html2txt', function(){
  gulp.src('text.html')
        .pipe(cheerio({
          run: function ($) {
            content.forEach(function(el,index) {
                $('.content').append("<span>" + el + "</span><br/>");
            });
        }
        }))
    .pipe(html2txt(400))
    .pipe(gulp.dest('dist'));
});


gulp.task('zip', function () {
    if(deployment){
        return gulp.src(['dist/**','!*/.DS_Store','!*/*.zip'])
            .pipe(zip('Archive.zip'))
            .pipe(gulp.dest('dist'));
    }
});

gulp.task('sftp', function () {
if(deployment){
    return gulp.src(sftpImages(), { base: './dist/images' })
        .pipe(sftp({
            host: 'pludev.com',
            remotePath : "/var/www/html/default/emailassets/" + remoteImagesPath,
            port: 22000,
            user: 'hive',
            pass: 'pPIFdxXOHqta5zo2jt'
        }))
        .on('finish', function() {
            gulp.start("sendmail");
        });
}
});

gulp.task('sendmail', function () {
if (deployment) {
  gulp.src( 'dist/index.html')
    .pipe(cheerio({
        run: function ($) {
            $('img').each(function () {
                var el = $(this),
                    src = el.attr("src");

                if (src) {
                    src = src.replace('images/', '');

                    if (boilerplateImg.indexOf(src) !== -1) {
                        el.attr("src", "http://pludev.com/emailassets/common/" + src);
                    } else {
                        el.attr("src", "http://pludev.com/emailassets/"+ remoteImagesPath + src);
                    }
                }
            });
        }
    }))
    .pipe(sendmail({
        key: 'key-8b75735e2b4010ece7356fe7b261a725',
        sender: 'news@perfectshave.theartofshaving.com',
        recipient: 'peoplelikeus.f77c397.new@emailtests.com',
        subject: config.subjectLine
      }));
    }
});

gulp.task('watch', function() {
	livereload.listen();
	gulp.watch('*').on('change', livereload.changed);
    gulp.watch(['index.html', 'css/*.css'], ['ejs']);
    gulp.watch(['dist/text.txt',['zip']]);
});


gulp.task('default', ['sass','init','ejs','html2txt','watch','images','zip']);