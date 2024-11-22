import uuid
from xpark.logic.user import handle_buy_badge, handle_get_badge_list
from xpark.utils.db import DB

def test_handle_buy_badge(mocker):
    user_id = uuid.uuid4()
    badge_id = 1
    mocker.patch.object(DB.pool, 'connection', return_value=mocker.MagicMock())
    mock_cursor = mocker.MagicMock()
    DB.pool.connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchone.side_effect = [
        {'current': 1000},
        {'badges': []}
    ]

    result = handle_buy_badge(user_id, badge_id)

    assert result.is_ok()


def test_handle_get_badge_list(mocker):
    user_id = uuid.uuid4()
    mocker.patch.object(DB.pool, 'connection', return_value=mocker.MagicMock())
    mock_cursor = mocker.MagicMock()
    DB.pool.connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = {'badges': [1, 2, 3]}

    result = handle_get_badge_list(user_id)

    assert result.is_ok()
    assert result.unwrap() == [1, 2, 3]