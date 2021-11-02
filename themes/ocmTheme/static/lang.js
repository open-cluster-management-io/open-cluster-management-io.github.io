$(document).ready(function () {
    toLocation = function(lang) {
        langPath = lang + '/'
        if (lang == 'en') {
            langPath = ''
        }
        
        currentLang = $('#current-lang').val()
        // default lang, only add the expected lang to the current href
        if (currentLang == 'en') {
            origin = $(location).attr('origin')

            return $(location).attr('href').replace(origin, origin + '/' + langPath)
        }
        
        pathName = $(location).attr('pathname')
        return $(location).attr('href').replace(pathName, pathName.replace(currentLang + '/', langPath))
    }

    $('#to-en').on('click', function () {
        $(location).attr('href', toLocation('en'))
    })

    $('#to-zh').on('click', function () {
        $(location).attr('href', toLocation('zh'))
    })
})
