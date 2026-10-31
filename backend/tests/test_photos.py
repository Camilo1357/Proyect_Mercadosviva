import requests
import pytest
from backend.src.mi_api.services import photos


def test_selected_city_photo_has_credit_and_license(monkeypatch):
    photos.city_photos.cache_clear()
    calls=[]
    class Response:
        def raise_for_status(self): pass
        def json(self):
            if len(calls)==1:
                return {'type':'standard','title':'Buenos Aires','extract':'Ciudad de Argentina.',
                        'originalimage':{'source':'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/City.jpg/1000px-City.jpg'}}
            return {'query':{'pages':{'1':{'title':'File:City.jpg','imageinfo':[{
                'mime':'image/jpeg','thumburl':'https://thumb.wikimedia.org/photo.jpg',
                'descriptionurl':'https://commons.wikimedia.org/wiki/File:City.jpg',
                'extmetadata':{'Artist':{'value':'<a href="/">Autor &amp; socio</a>'},
                               'LicenseShortName':{'value':'CC BY-SA 4.0'},
                               'LicenseUrl':{'value':'https://creativecommons.org/licenses/by-sa/4.0'}}}]}}}}
    def get(url,**kwargs): calls.append((url,kwargs));return Response()
    monkeypatch.setattr(photos.requests,'get',get)
    result=photos.city_photos('Buenos Aires','Argentina')
    assert result[0]['author']=='Autor & socio'
    assert 'referencia de la ciudad' in result[0]['label']
    assert calls[1][1]['params']['titles']=='File:City.jpg'
    assert photos.city_photos('Buenos Aires','Argentina')==result and len(calls)==2
    photos.city_photos.cache_clear()


@pytest.mark.parametrize('url',['http://upload.wikimedia.org/x','https://upload.wikimedia.org.evil.com/x','https://user@upload.wikimedia.org/x'])
def test_no_arbitrary_image_hosts(url):
    assert not photos.hosted(url,'upload.wikimedia.org')


def test_missing_attribution_not_returned(monkeypatch):
    photos.city_photos.cache_clear()
    class Response:
        def raise_for_status(self):pass
        def json(self):return {'query':{'pages':{'1':{'title':'File:Madrid.jpg','imageinfo':[{'mime':'image/jpeg'}]}}}}
    monkeypatch.setattr(photos.requests,'get',lambda *a,**k:Response())
    assert photos.city_photos('Madrid','España')==[]
    photos.city_photos.cache_clear()
