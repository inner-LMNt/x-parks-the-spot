import uuid
from xpark.logic.user import handle_get_points, handle_get_transaction_history
from xpark.utils.db import DB

def test_handle_get_points(mocker):
    user_id = uuid.uuid4()
    mocker.patch.object(DB.pool, 'connection', return_value=mocker.MagicMock())
    mock_cursor = mocker.MagicMock()
    DB.pool.connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = {'total': 1000, 'current': 500}

    result = handle_get_points(user_id)

    assert result.is_ok()
    assert result.unwrap() == {'total': 1000, 'current': 500}


def test_handle_get_transaction_history(mocker):
    user_id = uuid.uuid4()
    mocker.patch.object(DB.pool, 'connection', return_value=mocker.MagicMock())
    mock_cursor = mocker.MagicMock()
    DB.pool.connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchall.return_value = [
        {
            'balance_after_transaction': 500,
            'description': 'Test Transaction',
            'points_amount': 100,
            'transaction_type': 'spend'
        }
    ]

    result = handle_get_transaction_history(user_id)

    assert result.is_ok()
    assert result.unwrap() == [
        {
            'balance_after_transaction': 500,
            'description': 'Test Transaction',
            'points_amount': 100,
            'transaction_type': 'spend'
        }
    ]