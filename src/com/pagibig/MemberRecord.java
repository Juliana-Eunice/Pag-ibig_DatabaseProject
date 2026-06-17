package com.pagibig;

public class MemberRecord {
    private String pagibigId;
    private String memName;
    private String memType;
    private String sex;
    private String birthDate;
    private String citizenship;

    public MemberRecord(String pagibigId, String memName, String memType, String sex, String birthDate, String citizenship) {
        this.pagibigId = pagibigId;
        this.memName = memName;
        this.memType = memType;
        this.sex = sex;
        this.birthDate = birthDate;
        this.citizenship = citizenship;
    }

    public String getPagibigId() {
        return pagibigId;
    }

    public void setPagibigId(String pagibigId) {
        this.pagibigId = pagibigId;
    }

    public String getMemName() {
        return memName;
    }

    public void setMemName(String memName) {
        this.memName = memName;
    }

    public String getMemType() {
        return memType;
    }

    public void setMemType(String memType) {
        this.memType = memType;
    }

    public String getSex() {
        return sex;
    }

    public void setSex(String sex) {
        this.sex = sex;
    }

    public String getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(String birthDate) {
        this.birthDate = birthDate;
    }

    public String getCitizenship() {
        return citizenship;
    }

    public void setCitizenship(String citizenship) {
        this.citizenship = citizenship;
    }
}
