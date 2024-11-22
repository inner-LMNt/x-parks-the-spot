import uuid
from unittest.mock import patch, MagicMock
from xpark.logic.admin import get_raffle_entries, perform_raffle
from xpark.utils.db import DB
from result import Ok, Err

@patch('xpark.utils.db.DB.pool.connection')
def test_get_raffle_entries(mock_connection):
    mock_cursor = MagicMock()
    mock_connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchall.return_value = [
        {
            'user_id': str(uuid.uuid4()),
            'username': 'User1',
            'email': 'user1@example.com',
            'tickets': 10
        },
        {
            'user_id': str(uuid.uuid4()),
            'username': 'User2',
            'email': 'user2@example.com',
            'tickets': 5
        }
    ]

    result = get_raffle_entries()

    assert result.is_ok()
    assert len(result.unwrap()) == 2
    assert result.unwrap()[0]['username'] == 'User1'
    assert result.unwrap()[1]['username'] == 'User2'

@patch('xpark.utils.db.DB.pool.connection')
@patch('xpark.utils.mailer.send_email')
def test_perform_raffle(mock_send_email, mock_connection):
    mock_cursor = MagicMock()
    mock_connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchall.return_value = [
        {
            'user_id': str(uuid.uuid4()),
            'username': 'User1',
            'email': 'user1@example.com',
            'tickets': 10
        },
        {
            'user_id': str(uuid.uuid4()),
            'username': 'User2',
            'email': 'user2@example.com',
            'tickets': 5
        }
    ]

    result = perform_raffle()

    assert result.is_ok()
    winner = result.unwrap()[0]
    assert winner['username'] in ['User1', 'User2']
    assert mock_send_email.called
    assert mock_send_email.call_args[1]['to'] == winner['email']
    assert mock_send_email.call_args[1]['subject'] == "Congratulations! You've Won the XPark Raffle"