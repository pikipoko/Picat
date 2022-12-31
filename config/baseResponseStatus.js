module.exports = {
    // Success
    SUCCESS: { isSuccess: true, code: 1000, message: "성공" },

    TOKEN_EMPTY: {
        isSuccess: false,
        code: 2000,
        message: "JWT 토큰을 입력해주세요.",
    },
    TOKEN_VERIFICATION_FAILURE: {
        isSuccess: false,
        code: 3000,
        message: "JWT 토큰 검증 실패",
    },
    TOKEN_VERIFICATION_SUCCESS: {
        isSuccess: true,
        code: 1001,
        message: "JWT 토큰 검증 성공",
    },

    // User Response
    NICKNAME_EMPTY: {
        isSuccess: false,
        code: 2000,
        message: "닉네임(Id)을 입력하세요.",
    },
    PASSWORD_EMPTY: {
        isSuccess: false,
        code: 2001,
        message: "비밀번호를 입력하세요.",
    },
    SIGNIN_NICKNAME_WRONG: {
        isSuccess: false,
        code: 2002,
        message: "존재하지 않는 닉네임입니다.",
    },
    PASSWORD_WRONG: {
        isSuccess: false,
        code: 2003,
        message: "비밀번호가 맞지 않습니다.",
    },
    SIGNUP_VERIFIEDPASSWORD_EMPTY: {
        isSuccess: false,
        code: 2004,
        message: "비밀번호 확인을 입력하세요.",
    },
    SIGNUP_NAME_EMPTY: {
        isSuccess: false,
        code: 2005,
        message: "이름을 입력하세요.",
    },
    SIGNUP_REDUNDANT_EMAIL: {
        isSuccess: false,
        code: 2006,
        message: "존재하는 닉네임(Id)입니다.",
    },
    UPDATE_ERROR_TYPE: {
        isSuccess: false,
        code: 2007,
        message: "잘못된 형식 입니다.",
    },

    // DB Error
    SERVER_CONNECT_ERROR: {
        isSuccess: false,
        code: 3000,
        message: "서버 접속 에러입니다.",
    },

    // Profile Response
    LOGIN_ERROR: {
        isSuccess: false,
        code: 3000,
        message: "이용하려면 로그인 하세요",
    },
};
