from xpark.utils.mailer import generate_templated_email, send_email
from pytest_mock import MockerFixture


def test_templater() -> None:
    assert (
        generate_templated_email(
            "reset_password", name="Name", reset_link="https://blah"
        )
        == "Hi Name,\n\nYou have requested to reset your password. If this was not you, please ignore this email.\n\nIf you wish to reset your password, click the following link: https://blah\n\nFrom the XPark Team\n"
    )


def test_mailer(mocker: MockerFixture) -> None:
    # Mail mock
    mock_SMTP = mocker.MagicMock(name="xpark.utils.mailer.SMTPConn")
    mocker.patch("xpark.utils.mailer.SMTPConn", new=mock_SMTP)

    assert mock_SMTP.conn.send_message.call_count == 0

    send_email(
        subject="XPark Password Reset",
        to="xpark@example.com",
        content=generate_templated_email(
            "reset_password", name="Name", reset_link="https://blah"
        ),
    )

    assert mock_SMTP.conn.send_message.call_count == 1