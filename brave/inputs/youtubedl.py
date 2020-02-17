from brave.inputs.input import Input
from gi.repository import Gst
import brave.config as config
import brave.exceptions
#from __future__ import unicode_literals
import youtube_dl



# should input the stream link or use the built in/installed version of it or sym link it
# so we can call it and use it to get the url we want for a stream
purl = "notset"
channel_val = "not set yet..."
class MyLogger( object ):
    #purl = 'notset'
    def debug( self, msg ):
        global purl
        if "https" in msg:
            #print(msg)
            purl = msg
        pass

    def warning( self, msg ):
        #print(msg)
        pass

    def error( self, msg ):
        print( msg )


class YoutubeDLInput( Input ):
    '''
    Handles input via URI.
    This can be anything Playbin accepts, including local files and remote streams.
    '''

    def permitted_props( self ):
        return {
            **super().permitted_props(),
            'uri': {
                'type': 'str',
            },

            'buffer_duration': {
                'type': 'int',
                'default': 1000000000,
            },
            'loop': {
                'type': 'bool',
                'default': False,
            },
            'position': {
                'type': 'int'
            },
            'volume': {
                'type': 'float',
                'default': 1.0,
            },
            'width': {
                'type': 'int',
            },
            'height': {
                'type': 'int',
            },
            'disablevideo': {
                'type': 'bool',
                'default': False,
            },

            'title':{
                'type': 'str',
                'default': '',
            },
            'channel':{
                'type': 'str',
                'default': 'no channel set',
            },
            'format':{
                'type': 'str',
                'default': 'no format set',
            },
            'fps': {},
            'categories': {},
            'thumbnail': {},
            'view_count': { 'default': 0 },
            'format_note': { 'default': 'none' },
            'protocol': { 'default': 'none' },
        }

    def create_elements(self):
        # Playbin or playbin3 does all the hard work.
        # Playbin3 works better for continuous playback.
        # But it does not handle RTMP inputs as well.
        # See: http://gstreamer-devel.966125.n4.nabble.com/Behavior-differences-between-decodebin3-and-decodebin-and-vtdec-hw-not-working-on-OSX-td4680895.html
        # should do a check of the url by passing it through the stream link script
        # https://github.com/ytdl-org/youtube-dl/blob/master/README.md#embedding-youtube-dl

        # YouTube Link
        self.suri = ''

        # Filter for just audio formats when video is disabled
        ytFormats = 'best/best[height<=720][fps<=?30]/best[height<=720][fps<=?30]/best[height<=720][fps<=?30]/best[height<=720]'

        ydl_opts = {
            'format'     : ytFormats,
            'simulate'   : True,
            'noplaylist' : True,
            'forceurl'   : True,
            'logger'     : MyLogger(),
        }


        with youtube_dl.YoutubeDL( ydl_opts ) as ydl:

            # ydl.download( [ self.uri ] )

            meta = ydl.extract_info( self.uri, download=False )

            global ytdl_url

            ytdl_url = meta.get( 'url' )
            self.stream = ytdl_url
            self.suri = ytdl_url

            global channel_val
            channel_val = meta.get( 'uploader' )
            self.channel = channel_val

            self.format      = meta.get( 'format' )
            self.title       = meta.get( 'title' )
            self.fps         = meta.get( 'fps' )
            self.categories  = meta.get( 'categories' )
            self.thumbnail   = meta.get( 'thumbnail' )
            self.view_count  = meta.get( 'view_count' )
            self.format_note = meta.get( 'format_note' )
            self.protocol    = meta.get( 'protocol' )




        global purl
        self.stream = purl
        self.suri = purl

        allow_playbin3 = False

        if hasattr( self, 'suri' ) and allow_playbin3:
            is_rtmp = self.suri.startswith('rtmp')
            playbin_element = 'playbin' if is_rtmp else 'playbin3'
        else:
            playbin_element = 'playbin'

        self.create_pipeline_from_string( playbin_element )

        self.playsink = self.pipeline.get_by_name('playsink')
        self.playbin = self.playsink.parent

        self.playbin.set_property('uri', self.suri)
        self.playbin.connect('about-to-finish', self.__on_about_to_finish)

        if config.enable_video():
            self.create_video_elements()
        else:
            self._create_fake_video()

        if config.enable_audio():
            self.create_audio_elements()
        else:
            self._create_fake_audio()

    def _create_fake_video( self ):
        fakesink = Gst.ElementFactory.make('fakesink')
        self.playsink.set_property('video-sink', fakesink)

    def _create_fake_audio( self ):
        fakesink = Gst.ElementFactory.make('fakesink')
        self.playsink.set_property('audio-sink', fakesink)

    def create_video_elements(self):
        # bin_as_string = f'videoconvert ! videoscale ! capsfilter name=capsfilter ! queue ! {self.default_video_pipeline_string_end()}'

        bin_as_string = ( 'videoconvert !  video/x-raw  ! videoscale ! '
                          'capsfilter name=capsfilter ! queue ! '
                          'queue name=video_output_queue ! '
                          'tee name=final_video_tee allow-not-linked=true '
                          'final_video_tee. ! queue ! fakesink sync=true' )

        bin = Gst.parse_bin_from_description( bin_as_string, True )

        self.capsfilter         = bin.get_by_name( 'capsfilter' )
        self.final_video_tee    = bin.get_by_name( 'final_video_tee' )
        self.video_output_queue = bin.get_by_name( 'video_output_queue' )

        self._update_video_filter_caps()

        self.playsink.set_property( 'video-sink', bin )

    def create_audio_elements(self):
        # bin_as_string = f'audiorate tolerance=48000 ! audioconvert ! audioresample ! {config.default_audio_caps()} ! queue ! {self.default_audio_pipeline_string_end()}'

        bin_as_string = ( 'audiorate ! audioconvert ! audioresample ! '
                          'audio/x-raw, channels=2, layout=interleaved, rate=48000, format=S16LE ! '
                          'queue ! '
                          'queue name=audio_output_queue ! '
                          'tee name=final_audio_tee allow-not-linked=true '
                          'final_audio_tee. ! queue ! fakesink sync=true' )

        bin = Gst.parse_bin_from_description( bin_as_string, True )

        self.final_audio_tee    = bin.get_by_name( 'final_audio_tee' )
        self.audio_output_queue = bin.get_by_name( 'audio_output_queue' )

        self.playsink.set_property( 'audio-sink', bin )

    def on_pipeline_start(self):
        '''
        Called when the stream starts
        '''
        for connection in self.dest_connections():
            connection.unblock_intersrc_if_ready()

        # If the user has asked ot start at a certain timestamp, do it now
        # (as the position cannot be set until the pipeline is PAUSED/PLAYING):
        self._handle_position_seek()

    def _handle_position_seek(self):
        '''
        If the user has provided a position to seek to, this method handles it.
        '''
        if hasattr( self, 'position' ) and self.state in [Gst.State.PLAYING, Gst.State.PAUSED]:
            try:
                new_position = float( self.position )
                if self.pipeline.seek_simple( Gst.Format.TIME, Gst.SeekFlags.FLUSH, new_position ):
                    self.logger.debug( 'Successfully updated position to %s' % new_position )
                else:
                    self.logger.warning( 'Unable to set position to %s' % new_position )
            except ValueError:
                self.logger.warning( 'Invalid position %s provided' % self.position )
            delattr( self, 'position' )

    def get_input_cap_props(self):
        '''
        Parses the caps that arrive from the input, and returns them.
        This allows the height/width/framerate/audio_rate to be retrieved.
        '''
        elements = {}

        if hasattr(self, 'intervideosink'):
            elements['video'] = self.intervideosink

        if hasattr(self, 'interaudiosink'):
            elements['audio'] = self.interaudiosink

        props = {}
        for ( audioOrVideo, element ) in elements.items():

            if not element:
                MyLogger.error('YT-dl missing element!')
                return

            caps = element.get_static_pad('sink').get_current_caps()
            if not caps:
                MyLogger.error('YT-dl missing caps!')
                return

            size = caps.get_size()
            if size == 0:
                MyLogger.error('YT-dl caps size is 0!')
                return

            structure = caps.get_structure(0)
            props[audioOrVideo + '_caps_string'] = structure.to_string()

            if structure.has_field('framerate'):
                framerate = structure.get_fraction('framerate')
                props['framerate'] = framerate.value_numerator / framerate.value_denominator

            if structure.has_field('height'):
                props['height'] = structure.get_int('height').value

            if structure.has_field('width'):
                props['width'] = structure.get_int('width').value

            if structure.has_field('channels'):
                props[audioOrVideo + '_channels'] = structure.get_int('channels').value

            if structure.has_field('rate'):
                props[audioOrVideo + '_rate'] = structure.get_int('rate').value

        print( props )

        return props

    def _can_move_to_playing_state(self):
        '''
        Blocks moving into the PLAYING state if buffering is happening
        '''
        buffering_stats = self.get_buffering_stats()
        if not buffering_stats or not buffering_stats.busy:
            return True
        self.logger.debug('Buffering, so not moving to PLAYING')
        return False

    def get_buffering_stats(self):
        '''
        Returns an object with 'busy' (whether buffering is in progress)
        and 'percent' (the amount of buffering retrieved, 100=full buffer)
        '''
        query_buffer = Gst.Query.new_buffering(Gst.Format.PERCENT)
        result = self.pipeline.query(query_buffer) if hasattr(self, 'pipeline') else None
        return query_buffer.parse_buffering_percent() if result else None

    def summarise(self, for_config_file=False):
        '''
        Adds buffering stats to the summary
        '''
        s = super().summarise(for_config_file)

        if not for_config_file:
            buffering_stats = self.get_buffering_stats()
            if buffering_stats:
                s['buffering_percent'] = buffering_stats.percent

        return s

    def on_buffering(self, buffering_percent):
        '''
        Called to report buffering.
        '''
        # If buffering is 100% it might be time to go to the PLAYING state:
        if buffering_percent == 100:
            self._consider_changing_state()
        else:
            self.report_update_to_user()

    def handle_updated_props(self):
        super().handle_updated_props()
        self._handle_position_seek()
        if hasattr(self, 'buffer_duration'):
            self.playbin.set_property('buffer-duration', self.buffer_duration)
        if hasattr(self, 'volume'):
            self.playbin.set_property('volume', self.volume)

    def __on_about_to_finish(self, playbin):
        if self.loop:
            self.logger.debug('About to finish, looping')
            playbin.set_property('uri', self.suri)
