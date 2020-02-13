from brave.overlays.overlay import Overlay


class TextOverlay(Overlay):
    '''
    For doing a text overlay (text graphic).
    '''

    def permitted_props(self):
        return {
            **super().permitted_props(),
            'text': {
                'type': 'str',
                'default': 'Default text',
            },
            'font_size': {
                'type': 'int',
                'default': 18,
            },
            'valignment': {
                'type': 'str',
                'default': 'bottom',
                'permitted_values': {
                    'top': 'Top',
                    'center': 'Center',
                    'bottom': 'Bottom',
                    'baseline': 'Baseline',
                },
            },
            'halignment': {
                'type': 'str',
                'default': 'left',
                'permitted_values': {
                    'left': 'Left',
                    'center': 'Center',
                    'right': 'Right',
                },
            },
            'outline': {
                'type': 'bool',
                'default': False,
            },
            'shadow': {
                'type': 'bool',
                'default': True,
            },
            'shaded_background': {
                'type': 'bool',
                'default': False,
            },
            'visible': {
                'type': 'bool',
                'default': False,
            },
        }

    def create_elements(self):
        self.element = self.source.add_element('textoverlay', self, audio_or_video='video')
        self.set_element_values_from_props()

    def set_element_values_from_props(self):
        self.element.set_property('text', self.text)
        self.element.set_property('valignment', self.valignment)
        self.element.set_property('halignment', self.halignment)
        self.element.set_property('font-desc', 'Sans, %d' % self.font_size)
        self.element.set_property('draw-outline', self.outline)
        self.element.set_property('draw-shadow', self.shadow)
        self.element.set_property('shaded-background', self.shaded_background)
