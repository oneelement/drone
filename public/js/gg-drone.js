(function(window, document, $, undefined) {

    var hostname = document.location.hostname ? document.location.hostname : "localhost";

    var socket = io.connect('http://' + hostname);
        
    $('#picture-wrapper').click(function(){
        console.log('cheese');
        socket.emit('cheese');
    });

    socket.on('updateCheese', function(fileName){
        console.log(fileName);
        //$('#picture-taken img').attr('src', fileName);
        $('#picture-screen').css('display', 'block').fadeOut(2000);
        $('#picture-taken').css('display', 'block').css('background-image', 'url(' + fileName + ')');
    });

}(window, document, jQuery));
