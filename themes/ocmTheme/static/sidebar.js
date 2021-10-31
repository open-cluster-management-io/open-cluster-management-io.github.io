$(document).ready(function () {
    pathname = $(location).attr('pathname')
    paths = pathname.replace(/^\/|\/$/g, '').split('/')
    rootPath = $('#'+paths[0])
    if (rootPath.length == 0) {
        // the first path is i18n language, remove it and get the root path again
        paths.shift()
        rootPath = $('#'+paths[0])
    }

    rootPath.find('a.navlink').each(function() {
        href = $(this).attr('href')
        if (pathname == (href + '/')) {
            // highlight the current link
            $(this).css({'background':'#fff', 'color': '#7386D5'})

            // unfold parents ul
            $(this).parents('ul.collapse').each(function() {
                $(this).addClass('show')
            })

            // unfold sibling ul
            $(this).siblings('ul.collapse').each(function() {
                $(this).addClass('show')
            })

            return
        }
    })

    $('#sidebarToggle').on('click', function () {
        console.log('toggle sidebar');
        $('#sidebar').toggle()
    });
});
