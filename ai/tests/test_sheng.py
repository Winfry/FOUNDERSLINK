# The Sheng word list (ai/extraction/lexicons/sheng.json) and how it feeds
# profile extraction. Run: python -m pytest ai/tests

import pytest

from ai.extraction.sheng import amount_of, lexicon, normalise
from ai.tests.conftest import KEY


@pytest.mark.parametrize(
    "phrase, value",
    [
        ("ngiri hamsini", 50_000),
        ("thao tano", 5_000),
        ("elfu kumi na tano", 15_000),
        ("laki mbili", 200_000),
        ("laki mbili na ngiri hamsini", 250_000),
        ("laki moja na nusu", 150_000),
        ("milioni moja na laki tano", 1_500_000),
        ("ngiri 50", 50_000),
        ("soo tano", 500),
    ],
)
def test_spoken_amounts(phrase, value):
    assert amount_of(phrase) == value


def test_amounts_are_rewritten_inside_a_sentence():
    assert normalise("Nataka laki mbili na nusu ya stock") == "nataka 250000 ya stock"


def test_number_first_units_become_standard_units():
    assert normalise("nahitaji 50 ngiri") == "nahitaji 50 elfu"


def test_sheng_words_become_plain_words():
    assert normalise("Tuma doo kwa biz") == "tuma pesa kwa biashara"


def test_number_words_alone_are_left_alone():
    # "sita" also means "I will not": without a unit before it, it is not a number.
    assert normalise("Sita sahau, tano kati yao") == "sita sahau, tano kati yao"


def test_words_inside_other_words_are_left_alone():
    assert normalise("dooley bizarre") == "dooley bizarre"


def test_lexicon_has_no_unknown_sections():
    assert set(lexicon()) == {"units", "ones", "tens", "words"}


@pytest.mark.parametrize(
    "text, expected",
    [
        ("Niko na biz ya mtumba Nairobi, nataka ngiri hamsini",
         {"journey_type": "startup", "sector": "retail", "county": "Nairobi", "funding_amount_kes": 50_000}),
        ("Nina shamba ya kuku Kakamega, nahitaji laki mbili na nusu",
         {"sector": "agri", "county": "Kakamega", "funding_amount_kes": 250_000}),
        ("Nataka kuanzisha biz ya nduthi Mombasa, milioni moja",
         {"sector": "logistics", "county": "Mombasa", "funding_amount_kes": 1_000_000}),
        ("Kibanda yangu Kisumu inahitaji 80 thao",
         {"sector": "retail", "county": "Kisumu", "funding_amount_kes": 80_000}),
    ],
)
def test_extraction_understands_sheng(client, text, expected):
    fields = client.post("/extract-profile", json={"free_text": text}, headers=KEY).json()
    for key, value in expected.items():
        assert fields.get(key) == value, (key, fields)
