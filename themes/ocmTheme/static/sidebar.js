$(document).ready(function () {
    pathname = $(location).attr('pathname')
    paths = pathname.replace(/^\/|\/$/g, '').split('/')
    rootPath = $('#'+paths[0])
    if (rootPath.length == 0) {
        // the first path is i18n language, remove it and get the root path again
        paths.shift()
        rootPath = $('#'+paths[0])
    }

    // Parse for longest matching path
    navPath = ''
    navLink = null
    rootPath.find('a.navlink').each(function() {
        href = $(this).attr('href') + '/'
        if (pathname.includes(href) && href.length > navPath.length) {
            navPath = href
            navLink = $(this)
        }
    })

    if (navLink) {
        // highlight the current link
        navLink.css({'background':'#fff', 'color': '#7386D5'})
    }
    
    $('#sidebarToggle').on('click', function () {
        $('#sidebar').toggle()
    });
});
