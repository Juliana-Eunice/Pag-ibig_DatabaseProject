package com.pagibig;

public class GovernmentIdRecord {
    private String pagibigId;
    private String tinNum;
    private String sssNum;
    private String crn;
    private String emNum;
    private String afpPnpNum;
    private String depedCode;

    public GovernmentIdRecord(String pagibigId, String tinNum, String sssNum, String crn, String emNum, String afpPnpNum, String depedCode) {
        this.pagibigId = pagibigId;
        this.tinNum = tinNum;
        this.sssNum = sssNum;
        this.crn = crn;
        this.emNum = emNum;
        this.afpPnpNum = afpPnpNum;
        this.depedCode = depedCode;
    }

    public String getPagibigId() {
        return pagibigId;
    }

    public void setPagibigId(String pagibigId) {
        this.pagibigId = pagibigId;
    }

    public String getTinNum() {
        return tinNum;
    }

    public void setTinNum(String tinNum) {
        this.tinNum = tinNum;
    }

    public String getSssNum() {
        return sssNum;
    }

    public void setSssNum(String sssNum) {
        this.sssNum = sssNum;
    }

    public String getCrn() {
        return crn;
    }

    public void setCrn(String crn) {
        this.crn = crn;
    }

    public String getEmNum() {
        return emNum;
    }

    public void setEmNum(String emNum) {
        this.emNum = emNum;
    }

    public String getAfpPnpNum() {
        return afpPnpNum;
    }

    public void setAfpPnpNum(String afpPnpNum) {
        this.afpPnpNum = afpPnpNum;
    }

    public String getDepedCode() {
        return depedCode;
    }

    public void setDepedCode(String depedCode) {
        this.depedCode = depedCode;
    }
}
